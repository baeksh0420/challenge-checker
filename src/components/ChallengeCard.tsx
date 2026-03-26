import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Challenge } from '../types';
import { useAppContext } from '../store/AppContext';

interface ChallengeCardProps {
  challenge: Challenge;
  onPress: () => void;
}

export default function ChallengeCard({ challenge, onPress }: ChallengeCardProps) {
  const { state } = useAppContext();
  const participantCount = challenge.participants.length;
  const isJoined = challenge.participants.includes(state.currentUser.id);

  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  const now = new Date();
  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = now < startDate;

  const statusText = isActive ? '진행 중' : isUpcoming ? '예정' : '종료';
  const statusColor = isActive ? '#10B981' : isUpcoming ? '#F59E0B' : '#6B7280';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{challenge.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>  
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>{challenge.description}</Text>

      <View style={styles.footer}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>참여자</Text>
          <Text style={styles.infoValue}>{participantCount}명</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>주 {challenge.requiredDaysPerWeek}회</Text>
          <Text style={styles.infoValue}>벌금 {challenge.finePerMiss.toLocaleString()}원</Text>
        </View>
        {isJoined && (
          <View style={styles.joinedBadge}>
            <Text style={styles.joinedText}>참여 중</Text>
          </View>
        )}
      </View>

      <Text style={styles.dateRange}>
        {challenge.startDate} ~ {challenge.endDate}
      </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  dateRange: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
