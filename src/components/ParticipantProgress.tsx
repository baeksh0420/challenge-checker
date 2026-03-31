import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { useAppContext } from '../store/AppContext';
import { Challenge, User } from '../types';
import { calculateFine } from '../utils/fineCalculator';
import { participantIds } from '../utils/challengeGuards';
import {
  getDailyProgressSegments,
  getWeeklyProgressSegments,
  segmentBarColor,
} from '../utils/participantProgressSegments';

interface ParticipantProgressProps {
  challenge: Challenge;
}

export default function ParticipantProgress({ challenge }: ParticipantProgressProps) {
  const { state } = useAppContext();
  const fineMode = challenge.fineMode ?? 'weekly';
  const now = new Date();

  const getUser = (userId: string): User | undefined =>
    state.users.find((u) => u.id === userId);

  const renderParticipant = ({ item: userId }: { item: string }) => {
    const user = getUser(userId);
    if (!user) return null;

    const fine = calculateFine(challenge, userId, state.checkIns);
    const segments =
      fineMode === 'daily'
        ? getDailyProgressSegments(challenge, userId, state.checkIns, now)
        : getWeeklyProgressSegments(challenge, userId, state.checkIns, now);

    const completeCount = segments.filter((s) => s === 'complete').length;
    const totalSeg = segments.length;
    const unit = fineMode === 'daily' ? '일' : '주';
    const progressLabel =
      totalSeg > 0 ? `${completeCount}/${totalSeg}${unit}` : `0${unit}`;

    return (
      <View style={styles.participantRow}>
        {user.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: user.avatarColor }]}>
            <Text style={styles.avatarText}>{user.name[0]}</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={[styles.checkInCount, { color: user.avatarColor }]}>
              {progressLabel}
            </Text>
          </View>
          {totalSeg > 0 ? (
            <View style={styles.progressBarRow}>
              {segments.map((seg, i) => (
                <View
                  key={`${userId}-${i}`}
                  style={[
                    styles.progressSegmentWrap,
                    i < segments.length - 1 && styles.progressSegmentWrapGap,
                  ]}
                >
                  <View
                    style={[
                      styles.progressSegmentInner,
                      {
                        backgroundColor: segmentBarColor(seg, user.avatarColor),
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '0%' }]} />
            </View>
          )}
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
        data={participantIds(challenge)}
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
    alignItems: 'flex-start',
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
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
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
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 10,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  progressSegmentWrap: {
    flex: 1,
    minWidth: 2,
  },
  progressSegmentWrapGap: {
    marginRight: 2,
  },
  progressSegmentInner: {
    flex: 1,
    minHeight: 10,
    borderRadius: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  fineText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
});
