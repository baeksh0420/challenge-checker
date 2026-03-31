import React, { useEffect, useMemo, useState } from 'react';
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
  Image,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { CheckIn, RootStackParamList, User } from '../types';
import CalendarView from '../components/CalendarView';
import ParticipantProgress from '../components/ParticipantProgress';
import { challengeHasParticipant, participantIds } from '../utils/challengeGuards';
import { getParticipantAccent } from '../utils/participantColor';
import { calculateFine, formatLocalDate } from '../utils/fineCalculator';
import { isRecentEndedChallenge } from '../utils/challengeLifecycle';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ChallengeDetail'>;

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

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

  useEffect(() => {
    if (!challenge) return;
    const ids = participantIds(challenge);
    const uid = state.currentUser?.id;
    if (uid && ids.includes(uid)) {
      setSelectedUserId(uid);
    } else {
      setSelectedUserId(ids[0] ?? '');
    }
  }, [challenge?.id, state.currentUser?.id]);

  const selectedUserCheckIns = useMemo(() => {
    if (!challenge) return [];
    return state.checkIns.filter(
      (ci) => ci.challengeId === challenge.id && ci.userId === selectedUserId
    );
  }, [challenge, state.checkIns, selectedUserId]);

  const checkedDates = useMemo(
    () => new Set(selectedUserCheckIns.map((ci) => ci.date)),
    [selectedUserCheckIns]
  );

  const dayDetailCheckIns = useMemo(() => {
    if (!challenge || !detailDate) return [];
    return state.checkIns
      .filter((ci) => ci.challengeId === challenge.id && ci.date === detailDate)
      .sort((a, b) => parseCreatedAt(b) - parseCreatedAt(a));
  }, [detailDate, state.checkIns, challenge]);

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
            : `미달 ${f.missedWeeks}주 · 주당 ${challenge.finePerMiss.toLocaleString()}원`;
        fined.push({ user: u, amount: f.totalFine, detail });
      }
    }
    return { perfect, fined };
  }, [showEndedResultBlock, challenge, state.checkIns, state.users]);

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>챌린지를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const participants = participantIds(challenge);
  const isParticipant = challengeHasParticipant(challenge, state.currentUser?.id);
  const isActive = now >= new Date(challenge.startDate) && now <= new Date(challenge.endDate);

  const isCreator = state.currentUser?.id === challenge.creatorId;

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

  const handleShareInviteCode = async () => {
    const code = challenge.inviteCode ?? '';
    try {
      await Share.share({
        message: `챌린지 "${challenge.title}"에 참여하세요!\n초대 코드: ${code}`,
      });
    } catch {
      Alert.alert('초대 코드', `코드: ${code}\n이 코드를 참여자에게 공유하세요.`);
    }
  };

  const getUser = (userId: string) => state.users.find((u) => u.id === userId);

  const accent = getParticipantAccent(state.users, selectedUserId);

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

        <Text style={styles.title}>{challenge.title}</Text>
        {challenge.description ? <Text style={styles.description}>{challenge.description}</Text> : null}

        <View style={styles.infoBox}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>기간</Text>
            <Text style={styles.infoValue}>
              {challenge.startDate} ~ {challenge.endDate}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>주당 필수</Text>
            <Text style={styles.infoValue}>{challenge.requiredDaysPerWeek}회</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>벌금</Text>
            <Text style={styles.infoValue}>
              {challenge.finePerMiss.toLocaleString()}원/
              {(challenge.fineMode ?? 'weekly') === 'daily' ? '일' : '주'}
            </Text>
          </View>
          {challenge.fineMode === 'daily' && challenge.excludedDays?.length > 0 ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>제외 요일</Text>
              <Text style={styles.infoValue}>
                {challenge.excludedDays.map((d: number) => DAY_LABELS[d]).join(', ')}
              </Text>
            </View>
          ) : null}
        </View>

        <ParticipantProgress challenge={challenge} />

        <View style={{ height: 20 }} />

        <Text style={styles.sectionTitle}>캘린더</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
          {participants.map((uid) => {
            const user = getUser(uid);
            const isSelected = uid === selectedUserId;
            const tabAccent = getParticipantAccent(state.users, uid);
            return (
              <TouchableOpacity
                key={uid}
                style={[
                  styles.userTab,
                  isSelected && {
                    backgroundColor: tabAccent,
                  },
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
              : undefined
          }
        />

        <View style={styles.actionRow}>
          {isParticipant ? (
            <TouchableOpacity style={styles.inviteBtn} onPress={handleShareInviteCode}>
              <Text style={styles.inviteBtnText}>
                📨 초대 코드 공유: {challenge.inviteCode ?? ''}
              </Text>
            </TouchableOpacity>
          ) : null}
          {isParticipant && isActive ? (
            <TouchableOpacity
              style={styles.checkInBtn}
              onPress={() =>
                navigation.navigate('CheckIn', {
                  challengeId: challenge.id,
                })
              }
            >
              <Text style={styles.checkInBtnText}>오늘 인증하기</Text>
            </TouchableOpacity>
          ) : null}
          {isCreator ? (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() =>
                navigation.navigate('CreateChallenge', {
                  editChallengeId: challenge.id,
                })
              }
            >
              <Text style={styles.editBtnText}>챌린지 수정</Text>
            </TouchableOpacity>
          ) : null}
          {isCreator ? (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>챌린지 삭제</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
                  return (
                    <View style={styles.feedItem}>
                      <Text style={styles.feedAuthor}>{author?.name ?? '알 수 없음'}</Text>
                      <Text style={styles.feedMeta}>{ci.date}</Text>
                      {ci.type === 'text' ? (
                        <Text style={styles.feedText}>{String(ci.content ?? '')}</Text>
                      ) : (
                        <Image
                          source={{ uri: ci.content }}
                          style={styles.feedImage}
                          resizeMode="cover"
                        />
                      )}
                    </View>
                  );
                }}
              />
            )}
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
    padding: 20,
    paddingBottom: 40,
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
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
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  editBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editBtnText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
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
  feedImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#F3F4F6',
  },
});
