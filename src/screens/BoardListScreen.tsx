import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CheckInDetailModal from '../components/CheckInDetailModal';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { androidTopInsetStyle } from '../utils/androidTopInset';
import { useAppContext } from '../store/AppContext';
import { Challenge, CheckIn } from '../types';
import { challengeHasParticipant } from '../utils/challengeGuards';
import { getChallengeParticipantAccent } from '../utils/participantColor';
import { formatLocalDate, startOfLocalMondayWeek } from '../utils/fineCalculator';
import ProfileAvatarButton from '../components/ProfileAvatarButton';

const GAP = 8;
const HPAD = 12;
/** 캘린더 전용 강조(슬레이트) — 앱 보라와 역할 분리 */
const CAL_ACCENT = '#475569';

const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const WDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

function parseYmdLocal(ymd: string): Date {
  const p = ymd.split('-');
  if (p.length === 3) {
    const y = parseInt(p[0]!, 10);
    const mo = parseInt(p[1]!, 10) - 1;
    const d = parseInt(p[2]!, 10);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(d)) {
      return new Date(y, mo, d);
    }
  }
  return new Date();
}

function isDateInChallenge(ymd: string, ch: { startDate: string; endDate: string }): boolean {
  return ymd >= ch.startDate && ymd <= ch.endDate;
}

function clampDateToChallenge(ymd: string, ch: { startDate: string; endDate: string }): string {
  if (ymd < ch.startDate) return ch.startDate;
  if (ymd > ch.endDate) return ch.endDate;
  return ymd;
}

function weekIntersectsChallenge(monday: Date, ch: { startDate: string; endDate: string }): boolean {
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday);
    x.setDate(x.getDate() + i);
    const s = formatLocalDate(x);
    if (s >= ch.startDate && s <= ch.endDate) return true;
  }
  return false;
}

function formatCheckInDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3)
    return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
  return dateStr;
}

function parseCreatedAt(ci: CheckIn): number {
  const t = Date.parse(ci.createdAt);
  return Number.isFinite(t) ? t : 0;
}

function newestCheckInForChallenges(
  myChallenges: Challenge[],
  allCheckIns: CheckIn[],
): { challengeId: string; hadAny: boolean } {
  if (myChallenges.length === 0) {
    return { challengeId: '', hadAny: false };
  }
  const myIds = new Set(myChallenges.map((c) => c.id));
  const list = allCheckIns.filter((ci) => myIds.has(ci.challengeId));
  if (list.length === 0) {
    return { challengeId: myChallenges[0].id, hadAny: false };
  }
  const sorted = [...list].sort((a, b) => parseCreatedAt(b) - parseCreatedAt(a));
  return { challengeId: sorted[0].challengeId, hadAny: true };
}

type BoardViewMode = 'latest' | 'calendar';

export default function BoardListScreen() {
  const { state } = useAppContext();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const uid = state.currentUser?.id;

  const [userPickedChallengeId, setUserPickedChallengeId] = useState<
    string | null
  >(null);
  const [autoDefaultId, setAutoDefaultId] = useState<string | null>(null);
  const usedEmptyCheckInFallback = useRef(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [detailCheckInId, setDetailCheckInId] = useState<string | null>(null);
  const [boardViewMode, setBoardViewMode] = useState<BoardViewMode>('latest');
  const [selectedDateStr, setSelectedDateStr] = useState(() =>
    formatLocalDate(new Date())
  );

  const cardW = Math.floor((screenWidth - HPAD * 2 - GAP) / 2);

  const myChallenges = useMemo(() => {
    if (!uid) return [] as Challenge[];
    return state.challenges.filter((c) => challengeHasParticipant(c, uid));
  }, [state.challenges, uid]);

  useEffect(() => {
    if (myChallenges.length === 0) {
      setAutoDefaultId(null);
      usedEmptyCheckInFallback.current = false;
      return;
    }
    setAutoDefaultId((prev) => {
      if (prev != null && !myChallenges.some((c) => c.id === prev)) {
        usedEmptyCheckInFallback.current = false;
        prev = null;
      }
      const { challengeId, hadAny } = newestCheckInForChallenges(
        myChallenges,
        state.checkIns,
      );
      if (prev === null) {
        usedEmptyCheckInFallback.current = !hadAny;
        return challengeId;
      }
      if (usedEmptyCheckInFallback.current && hadAny) {
        usedEmptyCheckInFallback.current = false;
        return challengeId;
      }
      return prev;
    });
  }, [myChallenges, state.checkIns]);

  const suggestedFromRecency = useMemo(() => {
    if (myChallenges.length === 0) return null;
    return newestCheckInForChallenges(myChallenges, state.checkIns)
      .challengeId;
  }, [myChallenges, state.checkIns]);

  const activeChallengeId =
    userPickedChallengeId &&
    myChallenges.some((c) => c.id === userPickedChallengeId)
      ? userPickedChallengeId
      : (autoDefaultId != null
          ? autoDefaultId
          : (suggestedFromRecency ?? myChallenges[0]?.id ?? null));

  const activeChallenge = useMemo(
    () => myChallenges.find((c) => c.id === activeChallengeId) ?? null,
    [myChallenges, activeChallengeId],
  );

  useEffect(() => {
    if (!activeChallenge) return;
    setSelectedDateStr((prev) => {
      if (isDateInChallenge(prev, activeChallenge)) return prev;
      return clampDateToChallenge(prev, activeChallenge);
    });
  }, [activeChallengeId, activeChallenge?.startDate, activeChallenge?.endDate]);

  const items = useMemo(() => {
    if (!activeChallengeId) return [] as CheckIn[];
    return state.checkIns
      .filter((ci) => ci.challengeId === activeChallengeId)
      .sort((a, b) => parseCreatedAt(b) - parseCreatedAt(a));
  }, [state.checkIns, activeChallengeId]);

  const calendarItems = useMemo(() => {
    if (!activeChallengeId) return [] as CheckIn[];
    return state.checkIns
      .filter(
        (ci) =>
          ci.challengeId === activeChallengeId && ci.date === selectedDateStr
      )
      .sort((a, b) => parseCreatedAt(b) - parseCreatedAt(a));
  }, [state.checkIns, activeChallengeId, selectedDateStr]);

  const weekRowDays = useMemo(() => {
    const mon = startOfLocalMondayWeek(parseYmdLocal(selectedDateStr));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(d.getDate() + i);
      return {
        dateStr: formatLocalDate(d),
        dayOfMonth: d.getDate(),
      };
    });
  }, [selectedDateStr]);

  const { canGoCalPrev, canGoCalNext } = useMemo(() => {
    if (!activeChallenge) {
      return { canGoCalPrev: false, canGoCalNext: false };
    }
    const mon = startOfLocalMondayWeek(parseYmdLocal(selectedDateStr));
    const prevMon = new Date(mon);
    prevMon.setDate(prevMon.getDate() - 7);
    const nextMon = new Date(mon);
    nextMon.setDate(nextMon.getDate() + 7);
    return {
      canGoCalPrev: weekIntersectsChallenge(prevMon, activeChallenge),
      canGoCalNext: weekIntersectsChallenge(nextMon, activeChallenge),
    };
  }, [activeChallenge, selectedDateStr]);

  const selectedDateHeaderText = useMemo(() => {
    const d = parseYmdLocal(selectedDateStr);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const wk = WDAY_KO[d.getDay()] ?? '';
    return { line: `${m}월 ${day}일 (${wk})` };
  }, [selectedDateStr]);

  const detailCheckIn = detailCheckInId
    ? (state.checkIns.find((ci) => ci.id === detailCheckInId) ?? null)
    : null;

  const getUser = useCallback(
    (userId: string) => state.users.find((u) => u.id === userId),
    [state.users],
  );

  const getBoardAvatarAccent = useCallback(
    (userId: string) => {
      if (!activeChallenge) return '#9CA3AF';
      return getChallengeParticipantAccent(
        activeChallenge,
        state.users,
        userId,
      );
    },
    [activeChallenge, state.users],
  );

  /* ────── grid card ────── */
  const renderCard = ({
    item: ci,
    index,
  }: {
    item: CheckIn;
    index: number;
  }) => {
    const author = getUser(ci.userId);
    const thumbCount = ci.reactions?.thumbsUp?.length ?? 0;
    const otherCount = ci.reactions?.sad?.length ?? 0;
    const hasReactions = thumbCount > 0 || otherCount > 0;
    const isLeft = index % 2 === 0;
    const avatarAccent = getBoardAvatarAccent(ci.userId);

    return (
      <TouchableOpacity
        style={[styles.card, { width: cardW, marginRight: isLeft ? GAP : 0 }]}
        activeOpacity={0.85}
        onPress={() => setDetailCheckInId(ci.id)}
      >
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaLeft}>
            <ProfileAvatarButton
              user={author}
              userId={ci.userId}
              size={28}
              initialBackgroundColor={avatarAccent}
              style={{ marginRight: 0 }}
            />
            <Text
              style={styles.cardAuthor}
              numberOfLines={1}
              selectable
            >
              {author?.name ?? '알 수 없음'}
            </Text>
          </View>
          <Text style={styles.cardDate} selectable>
            {formatCheckInDate(ci.date)}
          </Text>
        </View>

        {ci.type === 'photo' ? (
          <>
            <Image
              source={{ uri: ci.content }}
              style={{ width: '100%', aspectRatio: 1 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={ci.id}
              transition={150}
            />
            {ci.textNote ? (
              <Text
                style={styles.cardNote}
                numberOfLines={2}
                selectable
              >
                {ci.textNote}
              </Text>
            ) : null}
          </>
        ) : (
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTextContent} numberOfLines={8} selectable>
              {String(ci.content ?? '')}
            </Text>
          </View>
        )}

        {hasReactions ? (
          <View style={styles.cardBadgeRow}>
            <View style={styles.cardBadgeGroup}>
              {thumbCount > 0 ? (
                <View style={styles.cardBadgeItem}>
                  <Ionicons
                    name="thumbs-up-outline"
                    size={12}
                    color="#9CA3AF"
                  />
                  <Text style={styles.cardBadgeCount} selectable={false}>
                    {thumbCount}
                  </Text>
                </View>
              ) : null}
              {otherCount > 0 ? (
                <View style={styles.cardBadgeItem}>
                  <Ionicons
                    name="rainy-outline"
                    size={12}
                    color="#9CA3AF"
                  />
                  <Text style={styles.cardBadgeCount} selectable={false}>
                    {otherCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, androidTopInsetStyle()]}>
      {/* challenge dropdown */}
      {myChallenges.length > 0 && (
        <>
          <View style={styles.challengeTitleWrap}>
            <TouchableOpacity
              style={styles.challengeTitleHit}
              onPress={() => setDropdownOpen(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="챌린지 선택"
            >
              <Text
                style={[
                  styles.challengeTitle,
                  { maxWidth: screenWidth - 52 },
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                selectable
              >
                {activeChallenge?.title ?? '챌린지'}
              </Text>
              <Ionicons
                name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#9CA3AF"
                style={styles.challengeTitleChevron}
              />
            </TouchableOpacity>
          </View>

          <Modal
            visible={dropdownOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setDropdownOpen(false)}
            statusBarTranslucent
          >
            <View style={styles.ddRoot}>
              <Pressable
                style={styles.ddBackdrop}
                onPress={() => setDropdownOpen(false)}
                accessibilityLabel="닫기"
              />
              <View
                style={[
                  styles.ddSheet,
                  { top: insets.top + 8, left: HPAD, right: HPAD },
                ]}
              >
                <ScrollView
                  bounces={false}
                  style={styles.ddScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  {myChallenges.map((c) => {
                    const selected = c.id === activeChallengeId;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.ddItem,
                          selected && styles.ddItemSelected,
                        ]}
                        onPress={() => {
                          setUserPickedChallengeId(c.id);
                          setDropdownOpen(false);
                        }}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.ddItemText,
                            selected && styles.ddItemTextSelected,
                          ]}
                          numberOfLines={2}
                          selectable
                        >
                          {c.title}
                        </Text>
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={22}
                            color="#4F46E5"
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      )}

      {myChallenges.length > 0 && activeChallengeId ? (
        <View style={styles.totalCountRow}>
          {boardViewMode === 'latest' ? (
            <Text style={styles.totalCountText} selectable>
              {`전체 ${items.length}개`}
            </Text>
          ) : (
            <View style={styles.totalCountSpacer} />
          )}
          <View style={styles.viewModeGroup}>
            <TouchableOpacity
              onPress={() => setBoardViewMode('latest')}
              activeOpacity={0.75}
              style={[
                styles.viewModeBtn,
                boardViewMode === 'latest' && styles.viewModeBtnActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="최신순 보기"
              accessibilityState={{ selected: boardViewMode === 'latest' }}
            >
              <Text
                style={[
                  styles.viewModeBtnText,
                  boardViewMode === 'latest' && styles.viewModeBtnTextActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                최신순 보기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBoardViewMode('calendar')}
              activeOpacity={0.75}
              style={[
                styles.viewModeBtn,
                boardViewMode === 'calendar' && styles.viewModeBtnActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="캘린더 보기"
              accessibilityState={{ selected: boardViewMode === 'calendar' }}
            >
              <Text
                style={[
                  styles.viewModeBtnText,
                  boardViewMode === 'calendar' && styles.viewModeBtnTextActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                캘린더 보기
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {boardViewMode === 'latest' ? (
        <FlatList
          style={styles.boardList}
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: HPAD }}
          contentContainerStyle={styles.grid}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {myChallenges.length === 0
                  ? '참여 중인 챌린지가 없습니다'
                  : '아직 인증 내역이 없습니다'}
              </Text>
            </View>
          }
          renderItem={renderCard}
        />
      ) : (
        <FlatList
          style={styles.boardList}
          data={calendarItems}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: HPAD }}
          contentContainerStyle={styles.grid}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            <View style={styles.calListHeader}>
              <View style={styles.calNavRow}>
                  <TouchableOpacity
                    style={styles.calNavBtn}
                    disabled={!activeChallenge || !canGoCalPrev}
                    onPress={() => {
                      if (!activeChallenge) return;
                      const d = parseYmdLocal(selectedDateStr);
                      d.setDate(d.getDate() - 7);
                      setSelectedDateStr(
                        clampDateToChallenge(
                          formatLocalDate(d),
                          activeChallenge
                        )
                      );
                    }}
                    hitSlop={10}
                    accessibilityLabel="이전 주"
                    accessibilityState={{ disabled: !activeChallenge || !canGoCalPrev }}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={22}
                      color={!activeChallenge || !canGoCalPrev ? '#D1D5DB' : '#6B7280'}
                    />
                  </TouchableOpacity>
                  <View style={styles.calWeekBlock}>
                    <View style={styles.calLettersRow}>
                      {WEEK_LETTERS.map((L, i) => {
                        const col = weekRowDays[i];
                        const inR =
                          col && activeChallenge
                            ? isDateInChallenge(
                                col.dateStr,
                                activeChallenge
                              )
                            : true;
                        return (
                          <View key={String(i)} style={styles.calLabelCell}>
                            <Text
                              style={[
                                styles.calLetter,
                                i === 6 && inR && styles.calLetterSunday,
                                col &&
                                  activeChallenge &&
                                  !inR &&
                                  styles.calLetterMuted,
                              ]}
                              selectable={false}
                            >
                              {L}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <View style={styles.calDaysRow}>
                      {weekRowDays.map((wd) => {
                        const inRange = activeChallenge
                          ? isDateInChallenge(
                              wd.dateStr,
                              activeChallenge
                            )
                          : true;
                        const isSel =
                          inRange && wd.dateStr === selectedDateStr;
                        if (!inRange) {
                          return (
                            <View
                              key={wd.dateStr}
                              style={styles.calDayCell}
                              pointerEvents="none"
                              accessibilityElementsHidden
                            >
                              <View style={styles.calDayCircle}>
                                <Text
                                  style={[
                                    styles.calDayNum,
                                    styles.calDayNumOut,
                                  ]}
                                  selectable={false}
                                >
                                  {wd.dayOfMonth}
                                </Text>
                              </View>
                            </View>
                          );
                        }
                        return (
                          <TouchableOpacity
                            key={wd.dateStr}
                            style={styles.calDayCell}
                            onPress={() => setSelectedDateStr(wd.dateStr)}
                            activeOpacity={0.8}
                            accessibilityLabel={`${wd.dateStr} 선택`}
                          >
                            <View
                              style={[
                                styles.calDayCircle,
                                isSel && styles.calDayCircleSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.calDayNum,
                                  isSel && styles.calDayNumOnAccent,
                                ]}
                                selectable={false}
                              >
                                {wd.dayOfMonth}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.calNavBtn}
                    disabled={!activeChallenge || !canGoCalNext}
                    onPress={() => {
                      if (!activeChallenge) return;
                      const d = parseYmdLocal(selectedDateStr);
                      d.setDate(d.getDate() + 7);
                      setSelectedDateStr(
                        clampDateToChallenge(
                          formatLocalDate(d),
                          activeChallenge
                        )
                      );
                    }}
                    hitSlop={10}
                    accessibilityLabel="다음 주"
                    accessibilityState={{ disabled: !activeChallenge || !canGoCalNext }}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={!activeChallenge || !canGoCalNext ? '#D1D5DB' : '#6B7280'}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.calSelectedBlock}>
                  <Text style={styles.calSelectedText} selectable>
                    {selectedDateHeaderText.line}
                    {selectedDateStr === formatLocalDate(new Date())
                      ? ' · 오늘'
                      : ''}
                  </Text>
                  <Text style={styles.calRightCount} selectable={false}>
                    {calendarItems.length}건
                  </Text>
                </View>
              <View style={styles.calHeaderSep} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {myChallenges.length === 0
                  ? '참여 중인 챌린지가 없습니다'
                  : '이 날짜에 인증이 없습니다'}
              </Text>
            </View>
          }
          renderItem={renderCard}
        />
      )}

      <CheckInDetailModal
        checkIn={detailCheckIn}
        onClose={() => setDetailCheckInId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  /* ── challenge title (tap = change) ── */
  challengeTitleWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: 'center',
  },
  challengeTitleHit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  challengeTitle: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 26,
  },
  challengeTitleChevron: {
    marginLeft: 6,
    marginTop: 1,
  },
  totalCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    marginTop: -2,
    gap: 8,
  },
  totalCountText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    flex: 1,
    minWidth: 0,
  },
  totalCountSpacer: {
    flex: 1,
    minWidth: 0,
  },
  viewModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
  viewModeBtn: {
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  viewModeBtnActive: {
    backgroundColor: '#4B5563',
  },
  viewModeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  viewModeBtnTextActive: {
    color: '#F9FAFB',
  },
  boardList: {
    flex: 1,
  },
  calListHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  calNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calNavBtn: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calWeekBlock: {
    flex: 1,
  },
  calLettersRow: {
    flexDirection: 'row',
  },
  calLabelCell: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 4,
  },
  calLetter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  calLetterSunday: {
    color: CAL_ACCENT,
  },
  calLetterMuted: {
    color: '#D1D5DB',
  },
  calDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  calDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayCircleSelected: {
    backgroundColor: CAL_ACCENT,
  },
  calDayNum: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  calDayNumOnAccent: {
    color: '#FFFFFF',
  },
  calDayNumOut: {
    color: '#D1D5DB',
    fontWeight: '500',
  },
  calSelectedBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 2,
    paddingHorizontal: 4,
  },
  calSelectedText: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: '700',
    color: CAL_ACCENT,
  },
  calRightCount: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  calHeaderSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  ddRoot: {
    flex: 1,
  },
  ddBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  ddSheet: {
    position: 'absolute',
    maxHeight: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  ddScroll: {
    maxHeight: 320,
  },
  ddItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  ddItemSelected: {
    backgroundColor: '#F5F3FF',
  },
  ddItemText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
  },
  ddItemTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },

  /* ── grid ── */
  grid: {
    paddingTop: 4,
    paddingBottom: 48,
  },

  /* ── card ── */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: GAP,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },
  cardMetaLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginRight: 4,
    gap: 6,
  },
  cardAuthor: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    minWidth: 0,
    color: '#4B5563',
  },
  cardDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  cardTextBox: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F9FAFB',
    padding: 10,
    justifyContent: 'center',
  },
  cardTextContent: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  cardNote: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  cardBadgeRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 12,
  },
  cardBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardBadgeCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  /* ── empty ── */
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});
