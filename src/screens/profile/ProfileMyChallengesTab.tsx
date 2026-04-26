import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../store/AppContext';
import { Challenge, CheckIn, RootStackParamList } from '../../types';
import { challengeHasParticipant } from '../../utils/challengeGuards';
import { getChallengeParticipantAccent } from '../../utils/participantColor';
import CalendarView from '../../components/CalendarView';
import CheckInDetailModal from '../../components/CheckInDetailModal';

const HPAD = 16;
const GRID_GAP = 6;

function parseCreatedAt(ci: CheckIn): number {
  const t = Date.parse(ci.createdAt);
  return Number.isFinite(t) ? t : 0;
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3)
    return `${parseInt(parts[1]!, 10)}/${parseInt(parts[2]!, 10)}`;
  return dateStr;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

export type ProfileMyChallengesTabProps = {
  /**
   * 인증·캘린더를 보여줄 사용자(상대 프로필이면 그 사람 uid).
   * 없으면 로그인한 본인.
   */
  subjectUserId?: string;
  /**
   * 있으면 `subjectUserId`와 이 uid가 **둘 다** 참가한 챌린지만 목록에 표시.
   */
  mutualWithUserId?: string;
  /** 그리드 상단 제목 (기본: 내 인증) */
  gridSectionTitle?: string;
};

export default function ProfileMyChallengesTab({
  subjectUserId,
  mutualWithUserId,
  gridSectionTitle = '내 인증',
}: ProfileMyChallengesTabProps = {}) {
  const { state } = useAppContext();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const myId = state.currentUser?.id;
  const dataUserId = subjectUserId ?? myId;

  const [userPickedId, setUserPickedId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const myChallenges = useMemo(() => {
    if (subjectUserId != null && mutualWithUserId != null) {
      return state.challenges.filter(
        (c) =>
          challengeHasParticipant(c, subjectUserId) &&
          challengeHasParticipant(c, mutualWithUserId),
      );
    }
    if (!myId) return [] as Challenge[];
    return state.challenges.filter((c) => challengeHasParticipant(c, myId));
  }, [state.challenges, myId, subjectUserId, mutualWithUserId]);

  useEffect(() => {
    if (myChallenges.length === 0) {
      setUserPickedId(null);
      return;
    }
    setUserPickedId((prev) => {
      if (prev && myChallenges.some((c) => c.id === prev)) return prev;
      return myChallenges[0]!.id;
    });
  }, [myChallenges]);

  const activeId =
    userPickedId && myChallenges.some((c) => c.id === userPickedId)
      ? userPickedId
      : (myChallenges[0]?.id ?? null);

  const activeChallenge = useMemo(
    () => myChallenges.find((c) => c.id === activeId) ?? null,
    [myChallenges, activeId],
  );

  const accent =
    activeChallenge && dataUserId
      ? getChallengeParticipantAccent(activeChallenge, state.users, dataUserId)
      : '#2563EB';

  const checkedDates = useMemo(() => {
    if (!activeId || !dataUserId) return new Set<string>();
    return new Set(
      state.checkIns
        .filter((ci) => ci.challengeId === activeId && ci.userId === dataUserId)
        .map((ci) => ci.date),
    );
  }, [state.checkIns, activeId, dataUserId]);

  const myItemsForChallenge = useMemo(() => {
    if (!activeId || !dataUserId) return [] as CheckIn[];
    return state.checkIns
      .filter((ci) => ci.challengeId === activeId && ci.userId === dataUserId)
      .sort((a, b) => parseCreatedAt(b) - parseCreatedAt(a));
  }, [state.checkIns, activeId, dataUserId]);

  const canOpenCheckInForSelf =
    !!myId && !!dataUserId && dataUserId === myId && !!activeChallenge;

  const tileW = (screenWidth - HPAD * 2 - GRID_GAP * 2) / 3;

  const detailCheckIn = detailId
    ? (state.checkIns.find((c) => c.id === detailId) ?? null)
    : null;

  const rows: CheckIn[][] = [];
  for (let i = 0; i < myItemsForChallenge.length; i += 3) {
    rows.push(myItemsForChallenge.slice(i, i + 3));
  }

  if (myChallenges.length === 0) {
    const emptyMsg =
      subjectUserId != null && mutualWithUserId != null
        ? '함께하는 챌린지가 없습니다'
        : '참여 중인 챌린지가 없습니다';
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>{emptyMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.challengeTitleWrap}>
        <TouchableOpacity
          style={styles.challengeTitleHit}
          onPress={() => setDropdownOpen(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.challengeTitle, { maxWidth: screenWidth - 56 }]}
            numberOfLines={2}
            selectable
          >
            {activeChallenge?.title ?? ''}
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
          />
          <View
            style={[
              styles.ddSheet,
              { top: insets.top + 8, left: HPAD, right: HPAD },
            ]}
          >
            <ScrollView bounces={false} style={styles.ddScroll}>
              {myChallenges.map((c) => {
                const selected = c.id === activeId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.ddItem, selected && styles.ddItemSelected]}
                    onPress={() => {
                      setUserPickedId(c.id);
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
                      <Ionicons name="checkmark" size={22} color="#2563EB" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {activeChallenge ? (
          <View style={styles.calendarBlock}>
            <CalendarView
              checkedDates={checkedDates}
              challengeStart={activeChallenge.startDate}
              challengeEnd={activeChallenge.endDate}
              accentColor={accent}
              onPressUncheckedInRangeDate={
                canOpenCheckInForSelf
                  ? (dateStr) => {
                      navigation.navigate('CheckIn', {
                        challengeId: activeChallenge!.id,
                        date: dateStr,
                      });
                    }
                  : undefined
              }
            />
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>{gridSectionTitle}</Text>
        {myItemsForChallenge.length === 0 ? (
          <Text style={styles.gridEmpty}>아직 인증이 없습니다</Text>
        ) : (
          <View style={styles.grid}>
            {rows.map((row, ri) => (
              <View key={`row-${ri}`} style={styles.gridRow}>
                {row.map((ci) => (
                  <TouchableOpacity
                    key={ci.id}
                    style={[styles.gridCell, { width: tileW }]}
                    activeOpacity={0.85}
                    onPress={() => setDetailId(ci.id)}
                  >
                    {ci.type === 'photo' ? (
                      <Image
                        source={{ uri: ci.content }}
                        style={styles.gridImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={ci.id}
                      />
                    ) : (
                      <View style={styles.gridTextBox}>
                        <Text style={styles.gridText} numberOfLines={6}>
                          {ci.content}
                        </Text>
                      </View>
                    )}
                    {ci.textNote ? (
                      <Text style={styles.gridNote} numberOfLines={2}>
                        {ci.textNote}
                      </Text>
                    ) : null}
                    <Text style={styles.gridDate}>{formatShortDate(ci.date)}</Text>
                  </TouchableOpacity>
                ))}
                {row.length < 3
                  ? Array.from({ length: 3 - row.length }).map((_, i) => (
                      <View
                        key={`pad-${ri}-${i}`}
                        style={{ width: tileW }}
                      />
                    ))
                  : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <CheckInDetailModal
        checkIn={detailCheckIn}
        onClose={() => setDetailId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  scrollContent: {
    paddingHorizontal: HPAD,
    paddingBottom: 32,
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  challengeTitleWrap: {
    paddingHorizontal: HPAD,
    paddingTop: 4,
    paddingBottom: 12,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 24,
  },
  challengeTitleChevron: { marginLeft: 6, marginTop: 1 },
  calendarBlock: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  gridEmpty: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  grid: { gap: GRID_GAP },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: GRID_GAP,
  },
  gridCell: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E5E7EB',
  },
  gridTextBox: {
    aspectRatio: 1,
    padding: 8,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  gridText: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 15,
  },
  gridNote: {
    fontSize: 10,
    color: '#6B7280',
    paddingHorizontal: 6,
    paddingTop: 4,
    lineHeight: 14,
  },
  gridDate: {
    fontSize: 10,
    color: '#9CA3AF',
    paddingHorizontal: 6,
    paddingBottom: 6,
    paddingTop: 2,
  },
  ddRoot: { flex: 1 },
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
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  ddScroll: { maxHeight: 320 },
  ddItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  ddItemSelected: { backgroundColor: '#EFF6FF' },
  ddItemText: { flex: 1, fontSize: 15, color: '#374151', lineHeight: 20 },
  ddItemTextSelected: { color: '#2563EB', fontWeight: '600' },
});
