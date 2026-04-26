import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Challenge, CheckIn } from '../types';
import { participantIds } from '../utils/challengeGuards';
import { formatLocalDate, getWeeklyProgressThisMondayWeek } from '../utils/fineCalculator';

interface ChallengeCardProps {
  challenge: Challenge;
  onPress: () => void;
  /** 내 챌린지(알림) 등에서만 사용 */
  subtitle?: string;
  /** 오늘인증 탭: 이미 오늘/이번 주 목표 달성 또는 오늘 인증 완료(주당) → 회색 음영 */
  verificationComplete?: boolean;
  /** 오늘인증 탭: 참여자·벌금·기간 줄 숨김 */
  hideFooter?: boolean;
  /** 오늘인증 탭: 설명 숨김 */
  hideDescription?: boolean;
  /** 오늘인증 탭: 진행중/예정/종료 뱃지 숨김 */
  hideStatusBadge?: boolean;
  /** 현재 사용자 ID (불꽃 표시용) */
  currentUserId?: string;
  /** 전체 체크인 목록 (불꽃 표시용) */
  checkIns?: CheckIn[];
}

export default function ChallengeCard({
  challenge,
  onPress,
  subtitle,
  verificationComplete = false,
  hideFooter = false,
  hideDescription = false,
  hideStatusBadge = false,
  currentUserId,
  checkIns = [],
}: ChallengeCardProps) {
  const participants = participantIds(challenge);
  const participantCount = participants.length;

  const now = new Date();
  const todayStr = formatLocalDate(now);
  const isActive = todayStr >= challenge.startDate && todayStr <= challenge.endDate;
  const isUpcoming = todayStr < challenge.startDate;

  const statusText = isActive ? '진행 중' : isUpcoming ? '예정' : '종료';
  const statusColor = isActive ? '#10B981' : isUpcoming ? '#F59E0B' : '#6B7280';

  const endDate = new Date(challenge.endDate + 'T00:00:00');
  const diffMs = endDate.getTime() - new Date(todayStr + 'T00:00:00').getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const dDayText = diffDays > 0 ? `D-${diffDays}` : diffDays === 0 ? 'D-Day' : `D+${Math.abs(diffDays)}`;

  const done = verificationComplete;

  const isDaily = challenge.fineMode === 'daily';
  let flameActive = false;
  let weeklyLabel: string | null = null;
  const todayExcluded = isDaily && (challenge.excludedDays ?? []).includes(now.getDay());

  if (isActive && currentUserId) {
    if (isDaily) {
      flameActive = checkIns.some(
        (ci) => ci.challengeId === challenge.id && ci.userId === currentUserId && ci.date === todayStr
      );
    } else {
      const { current, required } = getWeeklyProgressThisMondayWeek(challenge, currentUserId, checkIns, now);
      flameActive = current >= required;
      weeklyLabel = `${current}/${required}`;
    }
  }

  return (
    <TouchableOpacity
      style={[styles.card, done && styles.cardDone]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.header, hideStatusBadge && styles.headerTitleOnly]}>
        <View style={[styles.modeBadge, { backgroundColor: isDaily ? '#10B98120' : '#3B82F620' }]}>
          <Text style={[styles.modeBadgeText, { color: isDaily ? '#10B981' : '#3B82F6' }]}>
            {isDaily ? '매일' : `주${challenge.requiredDaysPerWeek}회`}
          </Text>
        </View>
        <Text
          style={[styles.title, done && styles.titleDone]}
          numberOfLines={hideStatusBadge ? 2 : 1}
          selectable
        >
          {challenge.title}
        </Text>
        {!hideStatusBadge && isActive ? (
          <View style={styles.flameWrap}>
            {todayExcluded ? (
              <Ionicons name="leaf" size={20} color="#10B981" />
            ) : (
              <Ionicons
                name={flameActive ? 'flame' : 'flame-outline'}
                size={20}
                color={flameActive ? '#F97316' : '#D1D5DB'}
              />
            )}
            {weeklyLabel ? (
              <Text style={[styles.weeklyLabel, flameActive && styles.weeklyLabelActive]}>
                {weeklyLabel}
              </Text>
            ) : null}
          </View>
        ) : !hideStatusBadge && !isActive ? (
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }, done && styles.statusBadgeDone]}>
            <Text style={[styles.statusText, { color: statusColor }, done && styles.statusTextDone]}>
              {statusText}
            </Text>
          </View>
        ) : null}
      </View>

      {!hideDescription && challenge.description ? (
        <Text
          style={[styles.description, done && styles.descriptionDone]}
          numberOfLines={2}
          selectable
        >
          {challenge.description}
        </Text>
      ) : null}

      {subtitle ? (
        <View style={[styles.subtitleWrap, done && styles.subtitleWrapDone]}>
          <Text style={[styles.subtitleText, done && styles.subtitleTextDone]}>{subtitle}</Text>
        </View>
      ) : null}

      {!hideFooter ? (
        <>
          <View style={styles.footer}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={13} color="#9CA3AF" style={{ marginRight: 3 }} />
              <Text style={[styles.infoValue, done && styles.mutedValue]}>{participantCount}명</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={13} color="#9CA3AF" style={{ marginRight: 3 }} />
              <Text style={[styles.infoValue, done && styles.mutedValue]}>{challenge.finePerMiss.toLocaleString()}원</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={13} color="#9CA3AF" style={{ marginRight: 3 }} />
              <Text style={[styles.infoValue, done && styles.mutedValue]}>{dDayText}</Text>
            </View>
          </View>

          <Text style={[styles.dateRange, done && styles.dateRangeDone]}>
            {challenge.startDate} ~ {challenge.endDate}
          </Text>
        </>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDone: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowOpacity: 0.03,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitleOnly: {
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  titleDone: {
    color: '#6B7280',
  },
  statusBadgeDone: {
    opacity: 0.85,
  },
  statusTextDone: {
    opacity: 0.9,
  },
  modeBadge: {
    width: 44,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  flameWrap: {
    alignItems: 'center',
  },
  weeklyLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D1D5DB',
    marginTop: 1,
  },
  weeklyLabelActive: {
    color: '#F97316',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  descriptionDone: {
    color: '#9CA3AF',
  },
  subtitleWrap: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  subtitleWrapDone: {
    backgroundColor: '#D1D5DB',
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4338CA',
    textAlign: 'center',
  },
  subtitleTextDone: {
    color: '#4B5563',
    fontWeight: '600',
  },
  mutedLabel: {
    color: '#9CA3AF',
  },
  mutedValue: {
    color: '#6B7280',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  dateRange: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  dateRangeDone: {
    color: '#9CA3AF',
    opacity: 0.85,
  },
});
