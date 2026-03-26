import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { RootStackParamList } from '../types';
import CalendarView from '../components/CalendarView';
import ParticipantProgress from '../components/ParticipantProgress';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ChallengeDetail'>;

const PARTICIPANT_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function ChallengeDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { state, actions } = useAppContext();
  const [selectedUserId, setSelectedUserId] = useState(state.currentUser?.id ?? '');

  const challenge = state.challenges.find(
    (c) => c.id === route.params.challengeId
  );

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>챌린지를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const isParticipant = state.currentUser ? challenge.participants.includes(state.currentUser.id) : false;
  const now = new Date();
  const isActive =
    now >= new Date(challenge.startDate) && now <= new Date(challenge.endDate);

  const isCreator = state.currentUser?.id === challenge.creatorId;

  const handleJoin = async () => {
    await actions.joinChallenge(challenge.id);
    Alert.alert('참여 완료', '챌린지에 참여했습니다!');
  };

  const handleDelete = () => {
    Alert.alert(
      '챌린지 삭제',
      '정말 이 챌린지를 삭제하시겠습니까?\n모든 인증 기록도 함께 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await actions.deleteChallenge(challenge.id);
            navigation.goBack();
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

  // 선택된 유저의 체크인 날짜들
  const selectedUserCheckIns = state.checkIns.filter(
    (ci) => ci.challengeId === challenge.id && ci.userId === selectedUserId
  );
  const checkedDates = new Set(selectedUserCheckIns.map((ci) => ci.date));

  const getUser = (userId: string) => state.users.find((u) => u.id === userId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{challenge.title}</Text>
        {challenge.description ? (
          <Text style={styles.description}>{challenge.description}</Text>
        ) : null}

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
              {challenge.finePerMiss.toLocaleString()}원/{(challenge.fineMode ?? 'weekly') === 'daily' ? '일' : '주'}
            </Text>
          </View>
          {(challenge.fineMode === 'daily' && challenge.excludedDays?.length > 0) && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>제외 요일</Text>
              <Text style={styles.infoValue}>
                {challenge.excludedDays.map((d: number) => DAY_LABELS[d]).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* 참여자 선택 탭 */}
        <Text style={styles.sectionTitle}>캘린더</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
          {challenge.participants.map((uid, idx) => {
            const user = getUser(uid);
            const isSelected = uid === selectedUserId;
            return (
              <TouchableOpacity
                key={uid}
                style={[
                  styles.userTab,
                  isSelected && {
                    backgroundColor: PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length],
                  },
                ]}
                onPress={() => setSelectedUserId(uid)}
              >
                <Text
                  style={[
                    styles.userTabText,
                    isSelected && { color: '#FFFFFF' },
                  ]}
                >
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
          accentColor={
            PARTICIPANT_COLORS[
              challenge.participants.indexOf(selectedUserId) %
                PARTICIPANT_COLORS.length
            ]
          }
        />

        <View style={{ height: 20 }} />
        <ParticipantProgress challenge={challenge} />

        <View style={styles.actionRow}>
          {isParticipant && (
            <TouchableOpacity style={styles.inviteBtn} onPress={handleShareInviteCode}>
              <Text style={styles.inviteBtnText}>📨 초대 코드 공유: {challenge.inviteCode ?? ''}</Text>
            </TouchableOpacity>
          )}
          {isParticipant && isActive && (
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
          )}
          {isCreator && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>챌린지 삭제</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  joinBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
});
