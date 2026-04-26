import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppContext } from '../../store/AppContext';
import { Challenge, CheckIn } from '../../types';
import { challengeHasParticipant } from '../../utils/challengeGuards';
import {
  calculateFine,
  getWeeklyFineRule,
} from '../../utils/fineCalculator';
import {
  getDailyProgressSegments,
  getWeeklyProgressSegments,
} from '../../utils/participantProgressSegments';

const HPAD = 16;

export type ProfileResultSummaryTabProps = {
  /** 요약 대상 사용자(상대 프로필) */
  subjectUserId?: string;
  /** 있으면 두 사용자가 모두 참가한 챌린지만 */
  mutualWithUserId?: string;
};

function achievementPercent(
  challenge: Challenge,
  userId: string,
  checkIns: CheckIn[],
): number {
  const fineMode = challenge.fineMode ?? 'weekly';
  const segments =
    fineMode === 'daily'
      ? getDailyProgressSegments(challenge, userId, checkIns)
      : getWeeklyProgressSegments(challenge, userId, checkIns);
  const total = segments.length;
  if (total === 0) return 0;
  const complete = segments.filter((s) => s.state === 'complete').length;
  return Math.round((complete / total) * 100);
}

export default function ProfileResultSummaryTab({
  subjectUserId,
  mutualWithUserId,
}: ProfileResultSummaryTabProps = {}) {
  const { state } = useAppContext();
  const uid = state.currentUser?.id;
  const summaryUserId = subjectUserId ?? uid;

  const myChallenges = useMemo(() => {
    if (subjectUserId != null && mutualWithUserId != null) {
      return state.challenges.filter(
        (c) =>
          challengeHasParticipant(c, subjectUserId) &&
          challengeHasParticipant(c, mutualWithUserId),
      );
    }
    if (!uid) return [] as Challenge[];
    return state.challenges.filter((c) => challengeHasParticipant(c, uid));
  }, [state.challenges, uid, subjectUserId, mutualWithUserId]);

  const totalCheckIns = useMemo(() => {
    if (!summaryUserId) return 0;
    if (subjectUserId != null && mutualWithUserId != null) {
      const ids = new Set(myChallenges.map((c) => c.id));
      return state.checkIns.filter(
        (ci) => ci.userId === summaryUserId && ids.has(ci.challengeId),
      ).length;
    }
    return state.checkIns.filter((ci) => ci.userId === summaryUserId).length;
  }, [state.checkIns, summaryUserId, subjectUserId, mutualWithUserId, myChallenges]);

  return (
    <ScrollView
      style={styles.flex}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.heroRow}>
        <View style={styles.heroCard}>
          <Text style={styles.heroValue}>{myChallenges.length}</Text>
          <Text style={styles.heroLabel}>
            {subjectUserId != null && mutualWithUserId != null
              ? '함께하는 챌린지'
              : '참여 챌린지'}
          </Text>
        </View>
        <View style={styles.heroCard}>
          <Text style={styles.heroValue}>{totalCheckIns}</Text>
          <Text style={styles.heroLabel}>
            {subjectUserId != null && mutualWithUserId != null
              ? '함께 챌린지 인증'
              : '총 인증'}
          </Text>
        </View>
      </View>

      {myChallenges.length === 0 ? (
        <Text style={styles.empty}>
          {subjectUserId != null && mutualWithUserId != null
            ? '함께하는 챌린지가 없습니다'
            : '참여 중인 챌린지가 없습니다'}
        </Text>
      ) : (
        myChallenges.map((c) => {
          if (!summaryUserId) return null;
          const count = state.checkIns.filter(
            (ci) => ci.challengeId === c.id && ci.userId === summaryUserId,
          ).length;
          const fine = calculateFine(c, summaryUserId, state.checkIns);
          const pct = achievementPercent(c, summaryUserId, state.checkIns);
          const fineDetail =
            fine.fineMode === 'daily'
              ? `${fine.missedDays}일 미인증`
              : getWeeklyFineRule(c) === 'perShortfall'
                ? `누적 ${fine.weeklyShortfallTotal}회 미달`
                : `${fine.missedWeeks}주 미달성`;

          return (
            <View key={c.id} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={2} selectable>
                {c.title}
              </Text>
              <View style={styles.cardRow}>
                <Text style={styles.cardKey}>인증 수</Text>
                <Text style={styles.cardVal}>{count}회</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardKey}>기간</Text>
                <Text style={styles.cardVal} selectable>
                  {c.startDate} ~ {c.endDate}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardKey}>달성률</Text>
                <Text style={styles.cardVal}>{pct}%</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardKey}>벌금</Text>
                <Text style={[styles.cardVal, fine.totalFine > 0 && styles.fineEm]}>
                  {fine.totalFine.toLocaleString()}원
                  {fine.totalFine > 0 ? ` · ${fineDetail}` : ''}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: HPAD,
    paddingBottom: 40,
    paddingTop: 4,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  heroCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  empty: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    lineHeight: 22,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: 12,
  },
  cardKey: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    width: 72,
  },
  cardVal: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 18,
  },
  fineEm: {
    color: '#DC2626',
  },
});
