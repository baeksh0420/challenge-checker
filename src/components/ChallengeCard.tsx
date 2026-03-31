import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Challenge } from '../types';
import { useAppContext } from '../store/AppContext';
import { challengeHasParticipant, participantIds } from '../utils/challengeGuards';

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
}

export default function ChallengeCard({
  challenge,
  onPress,
  subtitle,
  verificationComplete = false,
  hideFooter = false,
  hideDescription = false,
  hideStatusBadge = false,
}: ChallengeCardProps) {
  const { state } = useAppContext();
  const participants = participantIds(challenge);
  const participantCount = participants.length;
  const isJoined = challengeHasParticipant(challenge, state.currentUser?.id);

  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  const now = new Date();
  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = now < startDate;

  const statusText = isActive ? '진행 중' : isUpcoming ? '예정' : '종료';
  const statusColor = isActive ? '#10B981' : isUpcoming ? '#F59E0B' : '#6B7280';

  const done = verificationComplete;

  return (
    <TouchableOpacity
      style={[styles.card, done && styles.cardDone]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.header, hideStatusBadge && styles.headerTitleOnly]}>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={hideStatusBadge ? 2 : 1}>
          {challenge.title}
        </Text>
        {!hideStatusBadge ? (
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }, done && styles.statusBadgeDone]}>
            <Text style={[styles.statusText, { color: statusColor }, done && styles.statusTextDone]}>
              {statusText}
            </Text>
          </View>
        ) : null}
      </View>

      {!hideDescription && challenge.description ? (
        <Text style={[styles.description, done && styles.descriptionDone]} numberOfLines={2}>
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
              <Text style={[styles.infoLabel, done && styles.mutedLabel]}>참여자</Text>
              <Text style={[styles.infoValue, done && styles.mutedValue]}>{participantCount}명</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, done && styles.mutedLabel]}>주 {challenge.requiredDaysPerWeek}회</Text>
              <Text style={[styles.infoValue, done && styles.mutedValue]}>
                벌금 {challenge.finePerMiss.toLocaleString()}원
              </Text>
            </View>
            {isJoined && (
              <View style={[styles.joinedBadge, done && styles.joinedBadgeDone]}>
                <Text style={[styles.joinedText, done && styles.joinedTextDone]}>참여 중</Text>
              </View>
            )}
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
  joinedBadge: {
    backgroundColor: '#4F46E520',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  joinedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  joinedBadgeDone: {
    backgroundColor: '#9CA3AF40',
  },
  joinedTextDone: {
    color: '#6B7280',
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
