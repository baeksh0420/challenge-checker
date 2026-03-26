import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useAppContext } from '../store/AppContext';
import { Challenge, User } from '../types';
import { calculateFine } from '../utils/fineCalculator';

interface ParticipantProgressProps {
  challenge: Challenge;
}

export default function ParticipantProgress({ challenge }: ParticipantProgressProps) {
  const { state } = useAppContext();

  const getUser = (userId: string): User | undefined =>
    state.users.find((u) => u.id === userId);

  const getUserCheckInCount = (userId: string): number =>
    state.checkIns.filter(
      (ci) => ci.challengeId === challenge.id && ci.userId === userId
    ).length;

  const renderParticipant = ({ item: userId }: { item: string }) => {
    const user = getUser(userId);
    if (!user) return null;

    const checkInCount = getUserCheckInCount(userId);
    const fine = calculateFine(challenge, userId, state.checkIns);

    // 전체 일 수 계산
    const start = new Date(challenge.startDate);
    const end = new Date(challenge.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const progress = totalDays > 0 ? checkInCount / totalDays : 0;

    return (
      <View style={styles.participantRow}>
        <View style={[styles.avatar, { backgroundColor: user.avatarColor }]}>
          <Text style={styles.avatarText}>{user.name[0]}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.checkInCount}>{checkInCount}일</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(progress * 100, 100)}%` },
              ]}
            />
          </View>
          {fine.totalFine > 0 && (
            <Text style={styles.fineText}>
              벌금: {fine.totalFine.toLocaleString()}원 (
              {fine.fineMode === 'daily'
                ? `${fine.missedDays}일 미인증`
                : `${fine.missedWeeks}주 미달성`}
              )
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>참여자 현황</Text>
      <FlatList
        data={challenge.participants}
        renderItem={renderParticipant}
        keyExtractor={(item) => item}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  checkInCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  fineText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});
