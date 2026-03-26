import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { useAppContext } from '../store/AppContext';

export default function ProfileScreen() {
  const { state, actions } = useAppContext();
  const [name, setName] = useState(state.currentUser?.name ?? '');
  const [isEditing, setIsEditing] = useState(false);

  // 통계
  const myChallenges = state.challenges.filter((c) =>
    state.currentUser ? c.participants.includes(state.currentUser.id) : false
  );
  const myCheckIns = state.checkIns.filter(
    (ci) => ci.userId === state.currentUser?.id
  );
  const totalCheckIns = myCheckIns.length;
  const activeChallenges = myChallenges.filter((c) => {
    const now = new Date();
    return now >= new Date(c.startDate) && now <= new Date(c.endDate);
  }).length;

  const handleSaveName = async () => {
    if (name.trim()) {
      await actions.updateUserName(name.trim());
    }
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>프로필</Text>

        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: state.currentUser?.avatarColor ?? '#9CA3AF' },
            ]}
          >
            <Text style={styles.avatarText}>
              {state.currentUser?.name?.[0] ?? '?'}
            </Text>
          </View>

          {isEditing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={20}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName}>
                <Text style={styles.saveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.userName}>{state.currentUser?.name ?? ''}</Text>
              <Text style={styles.editHint}>탭하여 이름 변경</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 통계 */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{myChallenges.length}</Text>
            <Text style={styles.statLabel}>전체 챌린지</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{activeChallenges}</Text>
            <Text style={styles.statLabel}>진행 중</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalCheckIns}</Text>
            <Text style={styles.statLabel}>총 인증</Text>
          </View>
        </View>

        {/* 최근 인증 기록 */}
        <Text style={styles.sectionTitle}>최근 인증 기록</Text>
        {myCheckIns.length === 0 ? (
          <Text style={styles.emptyText}>아직 인증 기록이 없습니다.</Text>
        ) : (
          myCheckIns
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 10)
            .map((ci) => {
              const challenge = state.challenges.find(
                (c) => c.id === ci.challengeId
              );
              return (
                <View key={ci.id} style={styles.checkInItem}>
                  <View style={styles.checkInDot} />
                  <View style={styles.checkInInfo}>
                    <Text style={styles.checkInChallenge}>
                      {challenge?.title ?? '알 수 없는 챌린지'}
                    </Text>
                    <Text style={styles.checkInDate}>{ci.date}</Text>
                    {ci.type === 'text' && (
                      <Text style={styles.checkInContent} numberOfLines={2}>
                        {ci.content}
                      </Text>
                    )}
                    {ci.type === 'photo' && (
                      <Text style={styles.checkInContent}>📷 사진 인증</Text>
                    )}
                  </View>
                </View>
              );
            })
        )}
        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={actions.signOut}>
          <Text style={styles.logoutBtnText}>로그아웃</Text>
        </TouchableOpacity>      </ScrollView>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  editHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 16,
    color: '#1F2937',
    minWidth: 120,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4F46E5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
  },
  checkInItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  checkInDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
    marginTop: 5,
    marginRight: 12,
  },
  checkInInfo: {
    flex: 1,
  },
  checkInChallenge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  checkInDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  checkInContent: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  logoutBtn: {
    marginTop: 32,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
