import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Share,
  Modal,
  FlatList,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { CheckIn, RootStackParamList, User } from '../types';
import CalendarView from '../components/CalendarView';
import ImagePreviewModal from '../components/ImagePreviewModal';
import ParticipantProgress from '../components/ParticipantProgress';
import ProfileAvatarButton from '../components/ProfileAvatarButton';
import { challengeHasParticipant, participantIds } from '../utils/challengeGuards';
import { getChallengeParticipantAccent } from '../utils/participantColor';
import {
  calculateFine,
  formatLocalDate,
  getWeeklyFineRule,
} from '../utils/fineCalculator';
import { isRecentEndedChallenge } from '../utils/challengeLifecycle';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ChallengeDetail'>;

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 상세 표시: 제외 요일을 월→일 순으로 */
const WEEKDAY_MON_FIRST_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatExcludedDaysMonFirst(excluded: number[] | undefined): string {
  if (!excluded?.length) return '없음';
  const set = new Set(excluded);
  const ordered = WEEKDAY_MON_FIRST_ORDER.filter((d) => set.has(d));
  return ordered.map((d) => DAY_LABELS[d]).join(', ');
}

function parseCreatedAt(ci: CheckIn): number {
  const t = Date.parse(ci.createdAt);
  return Number.isFinite(t) ? t : 0;
}

export default function ChallengeDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { state, actions } = useAppContext();
  const challengeId = route.params.challengeId;
  const challenge = state.challenges.find((c) => c.id === challengeId);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#4F46E5');
  const { width: windowWidth } = useWindowDimensions();

  const isParticipant = challenge
    ? challengeHasParticipant(challenge, state.currentUser?.id)
    : false;
  const pushMuted = challenge
    ? (state.currentUser?.pushMutedChallengeIds ?? []).includes(challenge.id)
    : false;
  const isCreator = challenge
    ? state.currentUser?.id === challenge.creatorId
    : false;

  const titleNameTextMaxW = useMemo(() => {
    if (!challenge) return 0;
    // content paddingHorizontal: 20×2, titleRow: nameRow | 8pt gap | key
    const hPad = 40;
    const keySlot = isParticipant ? 8 + 28 + 8 + 28 : 0;
    const nameRowW = windowWidth - hPad - keySlot;
      const pencilSlot = isCreator ? 4 + 24 : 0;
    return Math.max(0, nameRowW - pencilSlot);
  }, [windowWidth, challenge, isParticipant, isCreator]);

  const COLOR_PALETTE = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#14B8A6', '#6366F1', '#A855F7',
  ];

  useEffect(() => {
    if (!challenge) return;
    const uid = state.currentUser?.id;
    const isP = uid ? challenge.participants.includes(uid) : false;
    if (isP && uid) {
      setSelectedUserId(uid);
      return;
    }
    const first = challenge.participants[0];
    if (first) setSelectedUserId(first);
  }, [challenge?.id, state.currentUser?.id]);

  const checkedDates = useMemo(() => {
    if (!challenge || !selectedUserId) return new Set<string>();
    return new Set(
      state.checkIns
        .filter((ci) => ci.challengeId === challenge.id && ci.userId === selectedUserId)
        .map((ci) => ci.date)
    );
  }, [challenge, state.checkIns, selectedUserId]);

  const dayDetailCheckIns = useMemo(() => {
    if (!challenge || !detailDate || !selectedUserId) return [];
    return state.checkIns
      .filter(
        (ci) =>
          ci.challengeId === challenge.id &&
          ci.date === detailDate &&
          ci.userId === selectedUserId
      )
      .sort((a, b) => parseCreatedAt(b) - parseCreatedAt(a));
  }, [detailDate, state.checkIns, challenge, selectedUserId]);

  const now = new Date();
  const todayStr = formatLocalDate(now);
  const showEndedResultBlock = challenge ? isRecentEndedChallenge(challenge, now) : false;

  const endedResult = useMemo(() => {
    if (!challenge || !showEndedResultBlock) return null;
    const ids = participantIds(challenge);
    const perfect: User[] = [];
    const fined: { user: User; amount: number; detail: string }[] = [];
    for (const uid of ids) {
      const u = state.users.find((x) => x.id === uid);
      if (!u) continue;
      const f = calculateFine(challenge, uid, state.checkIns);
      if (f.totalFine <= 0) {
        perfect.push(u);
      } else {
        const detail =
          f.fineMode === 'daily'
            ? `미인증 ${f.missedDays}일 · 일당 ${challenge.finePerMiss.toLocaleString()}원`
            : getWeeklyFineRule(challenge) === 'perShortfall'
              ? `누적 ${f.weeklyShortfallTotal}회 미달 · ${challenge.finePerMiss.toLocaleString()}원/회`
              : `미달 ${f.missedWeeks}주 · 주당 ${challenge.finePerMiss.toLocaleString()}원`;
        fined.push({ user: u, amount: f.totalFine, detail });
      }
    }
    return { perfect, fined };
  }, [showEndedResultBlock, challenge, state.checkIns, state.users]);

  const totalFineSum = useMemo(() => {
    if (!challenge) return 0;
    return participantIds(challenge).reduce((sum, uid) => {
      const f = calculateFine(challenge, uid, state.checkIns);
      return sum + f.totalFine;
    }, 0);
  }, [challenge, state.checkIns]);

  const handleCheckInReaction = useCallback(
    (ci: CheckIn, type: 'thumbsUp' | 'sad') => {
      const uid = state.currentUser?.id;
      if (!uid) return;
      const list = ci.reactions?.[type] ?? [];
      void actions.toggleCheckInReaction(ci.id, type, list.includes(uid));
    },
    [state.currentUser?.id, actions],
  );

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>챌린지를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const participants = participantIds(challenge);
  const isActive = todayStr >= challenge.startDate && todayStr <= challenge.endDate;

  const hasCheckedInToday = state.checkIns.some(
    (ci) =>
      ci.challengeId === challenge.id &&
      ci.userId === state.currentUser?.id &&
      ci.date === todayStr
  );

  const handleDelete = () => {
    const id = challenge.id;
    Alert.alert(
      '챌린지 삭제',
      '정말 이 챌린지를 삭제하시겠습니까?\n모든 인증 기록도 함께 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await actions.deleteChallenge(id);
                navigation.goBack();
              } catch {
                Alert.alert('오류', '삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
              }
            })();
          },
        },
      ]
    );
  };

  const openCreatorMenu = () => {
    Alert.alert(`${challenge.title} 편집`, undefined, [
      {
        text: '수정',
        onPress: () =>
          navigation.navigate('CreateChallenge', { editChallengeId: challenge.id }),
      },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => handleDelete(),
      },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleShareInviteCode = async () => {
    const code = challenge.inviteCode ?? '';
    try {
      await Share.share({
        message: `'${challenge.title}' 초대코드 공유 : ${code}`,
      });
    } catch {
      Alert.alert('초대 코드', `코드: ${code}\n이 코드를 참여자에게 공유하세요.`);
    }
  };

  const getUser = (userId: string) => state.users.find((u) => u.id === userId);

  const accent = selectedUserId
    ? getChallengeParticipantAccent(challenge, state.users, selectedUserId)
    : '#4F46E5';

  const isSelfCalendar =
    !!state.currentUser?.id && selectedUserId === state.currentUser.id;
  /** 내 캘린더에서 기간 내 지난 날·오늘 보충 인증 (종료된 챌린지 포함) */
  const canSupplementCheckIn = isParticipant && isSelfCalendar;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {showEndedResultBlock && endedResult ? (
          <View style={styles.endedResultBox}>
            <Text style={styles.endedResultTitle}>챌린지 종료 결과</Text>
            <Text style={styles.endedResultHint}>
              종료 후 7일 동안만 이 안내가 표시됩니다.
            </Text>
            <Text style={styles.endedResultSubheading}>완벽 성공</Text>
            {endedResult.perfect.length > 0 ? (
              <Text style={styles.endedResultNames}>
                {endedResult.perfect.map((u) => u.name).join(' · ')}
              </Text>
            ) : (
              <Text style={styles.endedResultEmpty}>없음</Text>
            )}
            <Text style={[styles.endedResultSubheading, styles.endedResultSpaced]}>
              벌금 발생
            </Text>
            {endedResult.fined.length > 0 ? (
              endedResult.fined.map(({ user, amount, detail }, idx) => (
                <View
                  key={user.id}
                  style={[
                    styles.fineRow,
                    idx === endedResult.fined.length - 1 && styles.fineRowLast,
                  ]}
                >
                  <Text style={styles.fineName}>{user.name}</Text>
                  <Text style={styles.fineAmount}>{amount.toLocaleString()}원</Text>
                  <Text style={styles.fineDetail}>{detail}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.endedResultEmpty}>없음</Text>
            )}
          </View>
        ) : null}

        <View style={styles.titleRow}>
          <View style={styles.titleNameRow}>
            <Text
              style={[styles.title, { maxWidth: titleNameTextMaxW }]}
            >
              {challenge.title}
            </Text>
            {isCreator ? (
              <TouchableOpacity
                onPress={openCreatorMenu}
                hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
              >
                <Ionicons name="pencil" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
          {isParticipant ? (
            <View style={styles.titleActions}>
              <TouchableOpacity
                style={styles.titleHeaderIconHit}
                onPress={handleShareInviteCode}
                hitSlop={{ top: 14, bottom: 14, left: 10, right: 6 }}
              >
                <Ionicons name="key-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.titleHeaderIconHit}
                onPress={() => {
                  void actions.setChallengePushMuted(challenge.id, !pushMuted);
                }}
                hitSlop={{ top: 14, bottom: 14, left: 6, right: 10 }}
                accessibilityLabel={
                  pushMuted ? '이 챌린지 인증 알림 켜기' : '이 챌린지 인증 알림 끄기'
                }
              >
                <Ionicons
                  name={pushMuted ? 'notifications-off-outline' : 'notifications-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        {challenge.description ? (
          <Text style={styles.description} selectable>
            {challenge.description}
          </Text>
        ) : null}

        <View style={styles.infoBoxRow}>
          <View style={styles.infoCard}>
            <View style={styles.infoTitleSlot}>
              <Text style={styles.infoCardLabel}>기간</Text>
            </View>
            <View style={styles.infoValueSlot}>
              <View style={styles.infoCardPeriod}>
                <Text
                  style={styles.infoCardValue}
                  selectable
                >
                  {challenge.startDate.slice(5)}
                </Text>
                <View style={styles.infoCardTildeRow}>
                  <Text style={styles.infoCardTilde} selectable>
                    -
                  </Text>
                </View>
                <Text
                  style={styles.infoCardValue}
                  selectable
                >
                  {challenge.endDate.slice(5)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoTitleSlot}>
              <Text style={styles.infoCardLabel}>누적 벌금</Text>
            </View>
            <View style={styles.infoValueSlot}>
              <Text style={styles.infoCardValueFine}>
                {totalFineSum.toLocaleString()}원
              </Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoTitleSlot}>
              <Text style={styles.infoCardLabel}>
                {challenge.fineMode === 'daily' ? '제외 요일' : '주당 필수'}
              </Text>
            </View>
            <View style={styles.infoValueSlot}>
              {challenge.fineMode === 'daily' ? (
                <Text style={styles.infoCardValue}>
                  {formatExcludedDaysMonFirst(challenge.excludedDays)}
                </Text>
              ) : (
                <Text style={styles.infoCardValue}>
                  {challenge.requiredDaysPerWeek}회
                </Text>
              )}
            </View>
          </View>
        </View>

        {isParticipant && isActive ? (
          <TouchableOpacity
            style={[
              styles.checkInBtn,
              hasCheckedInToday && styles.checkInBtnMuted,
            ]}
            onPress={() =>
              navigation.navigate('CheckIn', {
                challengeId: challenge.id,
              })
            }
          >
            <Text
              style={[
                styles.checkInBtnText,
                hasCheckedInToday && styles.checkInBtnTextMuted,
              ]}
            >
              {hasCheckedInToday ? '인증 수정하기' : '오늘 인증하기'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <ParticipantProgress challenge={challenge} />

        <View style={{ height: 20 }} />

        <Text style={styles.sectionTitle}>캘린더</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
          {/* 내 캘린더 먼저 */}
          {isParticipant && state.currentUser?.id ? (() => {
            const myUid = state.currentUser.id;
            const isSelected = selectedUserId === myUid;
            const tabAccent = getChallengeParticipantAccent(challenge, state.users, myUid);
            return (
              <TouchableOpacity
                key="mine"
                style={[styles.userTab, styles.myTab, isSelected && { backgroundColor: tabAccent }]}
                onPress={() => setSelectedUserId(myUid)}
              >
                <Text
                  style={[styles.userTabText, isSelected && { color: '#FFFFFF' }]}
                  numberOfLines={1}
                >
                  {state.currentUser?.name?.trim() || '내 캘린더'}
                </Text>
              </TouchableOpacity>
            );
          })() : null}
          {/* 기타 참여자 */}
          {participants
            .filter((uid) => uid !== state.currentUser?.id)
            .map((uid) => {
              const user = getUser(uid);
              const isSelected = uid === selectedUserId;
              const tabAccent = getChallengeParticipantAccent(challenge, state.users, uid);
              return (
                <TouchableOpacity
                  key={uid}
                  style={[
                    styles.userTab,
                    isSelected && { backgroundColor: tabAccent },
                  ]}
                  onPress={() => setSelectedUserId(uid)}
                >
                  <Text style={[styles.userTabText, isSelected && { color: '#FFFFFF' }]}>
                    {user?.name ?? '???'}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        <CalendarView
          checkedDates={checkedDates}
          challengeStart={challenge.startDate}
          challengeEnd={challenge.endDate}
          accentColor={accent}
          onPressCheckedDate={(dateStr) => setDetailDate(dateStr)}
          onPressUncheckedInRangeDate={
            canSupplementCheckIn
              ? (dateStr) => {
                  if (dateStr > todayStr) {
                    Alert.alert('알림', '오늘 이후 날짜에는 인증할 수 없습니다.');
                    return;
                  }
                  if (dateStr < challenge.startDate || dateStr > challenge.endDate) {
                    return;
                  }
                  navigation.navigate('CheckIn', {
                    challengeId: challenge.id,
                    date: dateStr,
                  });
                }
              : (dateStr) => setDetailDate(dateStr)
          }
        />

        <View style={styles.actionRow}>
          {isParticipant && state.currentUser?.id ? (
            <TouchableOpacity
              style={styles.colorBtn}
              onPress={() => {
                const cur = getChallengeParticipantAccent(
                  challenge,
                  state.users,
                  state.currentUser!.id
                );
                setSelectedColor(cur);
                setColorPickerVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.colorBtnDot,
                  {
                    backgroundColor: getChallengeParticipantAccent(
                      challenge,
                      state.users,
                      state.currentUser.id
                    ),
                  },
                ]}
              />
              <Text style={styles.colorBtnText}>내 컬러 변경</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {challenge.fineMode !== 'daily' ? (
          <Text style={styles.weeklyFineHint}>
            {getWeeklyFineRule(challenge) === 'perShortfall'
              ? `주간 벌금: 매주 월~일 기준, 부족한 횟수 × ${challenge.finePerMiss.toLocaleString()}원이 누적됩니다.`
              : `주간 벌금: 매주 월~일 기준, 목표 미달 시 주당 ${challenge.finePerMiss.toLocaleString()}원이 부과됩니다.`}
          </Text>
        ) : null}
      </ScrollView>

      <Modal
        visible={detailDate !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailDate(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDetailDate(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{detailDate} 인증</Text>
              <TouchableOpacity onPress={() => setDetailDate(null)} hitSlop={12}>
                <Text style={styles.modalClose}>닫기</Text>
              </TouchableOpacity>
            </View>
            {dayDetailCheckIns.length === 0 ? (
              <Text style={styles.modalEmpty}>이 날 등록된 인증이 없습니다.</Text>
            ) : (
              <FlatList
                data={dayDetailCheckIns}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                renderItem={({ item: ci }) => {
                  const author = getUser(ci.userId);
                  const isMine = ci.userId === state.currentUser?.id;
                  const uid = state.currentUser?.id;
                  const thumbs = ci.reactions?.thumbsUp ?? [];
                  const rainy = ci.reactions?.sad ?? [];
                  const myThumbs = uid ? thumbs.includes(uid) : false;
                  const myRainy = uid ? rainy.includes(uid) : false;
                  return (
                    <View style={styles.feedItem}>
                      <View style={styles.feedItemHeader}>
                        <ProfileAvatarButton
                          user={author}
                          userId={ci.userId}
                          size={36}
                          initialBackgroundColor={getChallengeParticipantAccent(
                            challenge,
                            state.users,
                            ci.userId
                          )}
                          style={{ marginRight: 8, marginTop: 0 }}
                          beforeNavigate={() => setDetailDate(null)}
                        />
                        <View style={styles.feedItemHeaderText}>
                          <Text
                            style={[
                              styles.feedAuthor,
                              author
                                ? { color: getChallengeParticipantAccent(challenge, state.users, ci.userId) }
                                : null,
                            ]}
                            selectable
                          >
                            {author?.name ?? '알 수 없음'}
                          </Text>
                          <Text style={styles.feedMeta} selectable>
                            {ci.date}
                          </Text>
                        </View>
                        {isMine ? (
                          <View style={styles.feedItemActions}>
                            <TouchableOpacity
                              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                              onPress={() => {
                                setDetailDate(null);
                                navigation.navigate('CheckIn', {
                                  challengeId: challenge.id,
                                  date: ci.date,
                                });
                              }}
                            >
                              <Text style={styles.feedEditLabel}>수정</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                              onPress={() =>
                                Alert.alert('인증 삭제', '이 인증을 삭제할까요?', [
                                  { text: '취소', style: 'cancel' },
                                  {
                                    text: '삭제',
                                    style: 'destructive',
                                    onPress: () => void actions.deleteCheckIn(ci),
                                  },
                                ])
                              }
                            >
                              <Text style={styles.feedDeleteLabel}>삭제</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                      {ci.type === 'text' ? (
                        <Text style={styles.feedText} selectable>
                          {String(ci.content ?? '')}
                        </Text>
                      ) : (
                        <>
                          <TouchableOpacity
                            activeOpacity={0.92}
                            onPress={() => setPhotoPreviewUri(ci.content)}
                            accessibilityLabel="사진 크게 보기"
                          >
                            <Image
                              source={{ uri: ci.content }}
                              style={styles.feedImage}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                              recyclingKey={ci.id}
                              transition={150}
                            />
                          </TouchableOpacity>
                          {ci.textNote ? (
                            <Text style={styles.feedPhotoNote} selectable>
                              {ci.textNote}
                            </Text>
                          ) : null}
                        </>
                      )}
                      {uid ? (
                        <View style={styles.feedReactionRow}>
                          <TouchableOpacity
                            style={[
                              styles.feedReactionBtn,
                              myThumbs && styles.feedReactionBtnActive,
                            ]}
                            onPress={() => handleCheckInReaction(ci, 'thumbsUp')}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={myThumbs ? 'thumbs-up' : 'thumbs-up-outline'}
                              size={18}
                              color={myThumbs ? '#4F46E5' : '#9CA3AF'}
                            />
                            {thumbs.length > 0 ? (
                              <Text
                                style={[
                                  styles.feedReactionCount,
                                  myThumbs && styles.feedReactionCountActive,
                                ]}
                              >
                                {thumbs.length}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.feedReactionBtn,
                              myRainy && styles.feedReactionBtnActive,
                            ]}
                            onPress={() => handleCheckInReaction(ci, 'sad')}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={myRainy ? 'rainy' : 'rainy-outline'}
                              size={18}
                              color={myRainy ? '#4F46E5' : '#9CA3AF'}
                            />
                            {rainy.length > 0 ? (
                              <Text
                                style={[
                                  styles.feedReactionCount,
                                  myRainy && styles.feedReactionCountActive,
                                ]}
                              >
                                {rainy.length}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <ImagePreviewModal
        visible={!!photoPreviewUri}
        imageUri={photoPreviewUri}
        onClose={() => setPhotoPreviewUri(null)}
      />

      <Modal
        visible={colorPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setColorPickerVisible(false)}
      >
        <Pressable style={styles.colorBackdrop} onPress={() => setColorPickerVisible(false)}>
          <Pressable style={styles.colorCard} onPress={() => {}}>
            <Text style={styles.colorTitle}>내 캘린더 컬러 변경</Text>
            <View style={styles.colorPalette}>
              {COLOR_PALETTE.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorDotSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                  activeOpacity={0.8}
                />
              ))}
            </View>
            <View style={styles.colorPreviewRow}>
              <View style={[styles.colorPreviewDot, { backgroundColor: selectedColor }]} />
              <Text style={styles.colorPreviewText}>선택된 컬러</Text>
            </View>
            <View style={styles.colorActions}>
              <TouchableOpacity
                style={styles.colorCancelBtn}
                onPress={() => setColorPickerVisible(false)}
              >
                <Text style={styles.colorCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.colorConfirmBtn}
                onPress={() => {
                  void (async () => {
                    if (state.currentUser?.id) {
                      await actions.updateParticipantColor(challenge.id, selectedColor);
                    }
                    setColorPickerVisible(false);
                  })();
                }}
              >
                <Text style={styles.colorConfirmBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 56,
  },
  endedResultBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  endedResultTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },
  endedResultHint: {
    fontSize: 12,
    color: '#B45309',
    marginBottom: 14,
  },
  endedResultSubheading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 6,
  },
  endedResultSpaced: {
    marginTop: 12,
  },
  endedResultNames: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 22,
  },
  endedResultEmpty: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  fineRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  fineRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  fineName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  fineAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 2,
  },
  fineDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  titleNameRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    flexShrink: 0,
  },
  /** 열쇠·알림 아이콘 동일 박스에 중앙 정렬해 한 줄로 맞춤 */
  titleHeaderIconHit: {
    flexShrink: 0,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  infoBoxRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
  },
  infoTitleSlot: {
    width: '100%',
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  infoValueSlot: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  infoCardValueFine: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
  },
  infoCardLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  infoCardPeriod: {
    width: '100%',
    alignItems: 'center',
    gap: 2,
  },
  infoCardTildeRow: {
    width: '100%',
    alignItems: 'center',
  },
  infoCardTilde: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  weeklyFineHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  userTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  actionRow: {
    marginTop: 24,
    gap: 12,
  },
  checkInBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  checkInBtnMuted: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  checkInBtnTextMuted: {
    color: '#6B7280',
  },
  inviteBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  inviteBtnText: {
    color: '#4F46E5',
    fontSize: 15,
    fontWeight: '700',
  },
  colorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colorBtnDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  colorBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  myTab: {
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  colorBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  colorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    padding: 24,
  },
  colorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#1F2937',
    transform: [{ scale: 1.15 }],
  },
  colorPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  colorPreviewDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  colorPreviewText: {
    fontSize: 14,
    color: '#6B7280',
  },
  colorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  colorCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  colorCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  colorConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  colorConfirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '72%',
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  modalEmpty: {
    padding: 24,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 15,
  },
  modalList: {
    paddingHorizontal: 16,
  },
  feedItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  feedItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feedItemHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  feedItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  feedEditLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  feedDeleteLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  feedAuthor: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  feedMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  feedText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 8,
    lineHeight: 20,
  },
  feedPhotoNote: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  feedImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#F3F4F6',
  },
  feedReactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  feedReactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 4,
  },
  feedReactionBtnActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  feedReactionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  feedReactionCountActive: {
    color: '#4F46E5',
  },
});
