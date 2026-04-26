import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useAppContext } from '../store/AppContext';
import ProfileAvatarButton from './ProfileAvatarButton';
import { Challenge, User } from '../types';
import { calculateFine, getWeeklyFineRule } from '../utils/fineCalculator';
import { participantIds } from '../utils/challengeGuards';
import {
  getDailyProgressSegments,
  getWeeklyProgressSegments,
  segmentBarColor,
  segmentCurrentFocusPendingColor,
} from '../utils/participantProgressSegments';
import { getChallengeParticipantAccent } from '../utils/participantColor';

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

    const accentColor = getChallengeParticipantAccent(challenge, state.users, userId);
    const fine = calculateFine(challenge, userId, state.checkIns);
    const segments =
      fineMode === 'daily'
        ? getDailyProgressSegments(challenge, userId, state.checkIns, now)
        : getWeeklyProgressSegments(challenge, userId, state.checkIns, now);

    const completeCount = segments.filter((s) => s.state === 'complete').length;
    const totalSeg = segments.length;
    const unit = fineMode === 'daily' ? '일' : '주';
    const progressLabel =
      totalSeg > 0 ? `${completeCount}/${totalSeg}${unit}` : `0${unit}`;

    return (
      <View style={styles.participantRow}>
        <ProfileAvatarButton
          user={user}
          userId={userId}
          size={40}
          initialBackgroundColor={accentColor}
          style={{ marginRight: 12 }}
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} selectable>
              {user.name}
            </Text>
            <Text style={[styles.checkInCount, { color: accentColor }]}>
              {progressLabel}
            </Text>
          </View>
          {totalSeg > 0 ? (
            <View style={styles.progressBarRow}>
              {segments.map((seg, i) => {
                const { state, isCurrentFocus } = seg;
                const baseColor = segmentBarColor(state, accentColor);
                const fillColor =
                  isCurrentFocus && state === 'pending'
                    ? segmentCurrentFocusPendingColor(accentColor)
                    : baseColor;
                return (
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
                        { backgroundColor: fillColor },
                      ]}
                    />
                  </View>
                );
              })}
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
                : getWeeklyFineRule(challenge) === 'perShortfall'
                  ? `누적 ${fine.weeklyShortfallTotal}회 미달`
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
    alignItems: 'center',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    paddingVertical: 1,
  },
  progressSegmentWrap: {
    flex: 1,
    minWidth: 0,
    minHeight: 8,
    justifyContent: 'center',
  },
  progressSegmentWrapGap: {
    marginRight: 2,
  },
  progressSegmentInner: {
    height: 8,
    borderRadius: 2,
    alignSelf: 'stretch',
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
