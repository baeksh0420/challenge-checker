import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { RootStackParamList } from '../types';
import ChallengeCard from '../components/ChallengeCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const { state } = useAppContext();
  const navigation = useNavigation<Nav>();

  const myChallenges = state.challenges.filter((c) =>
    state.currentUser ? c.participants.includes(state.currentUser.id) : false
  );

  const activeChallenges = myChallenges.filter((c) => {
    const now = new Date();
    return now >= new Date(c.startDate) && now <= new Date(c.endDate);
  });

  const upcomingChallenges = myChallenges.filter(
    (c) => new Date() < new Date(c.startDate)
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>챌린지 체커</Text>
      </View>

      <FlatList
        data={[...activeChallenges, ...upcomingChallenges]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeChallenges.length > 0 ? '진행 중인 챌린지' : '등록된 챌린지가 없습니다'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ChallengeCard
            challenge={item}
            onPress={() =>
              navigation.navigate('ChallengeDetail', { challengeId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>아직 챌린지가 없어요</Text>
            <Text style={styles.emptySubText}>새 챌린지를 만들어보세요!</Text>
          </View>
        }
      />

      <View style={styles.fabRow}>
        <TouchableOpacity
          style={styles.fabSecondary}
          onPress={() => navigation.navigate('JoinByCode')}
        >
          <Text style={styles.fabSecondaryText}>📨 초대 코드 입력</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateChallenge')}
        >
          <Text style={styles.fabText}>+ 챌린지 만들기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  fabRow: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
  },
  fabSecondary: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fabSecondaryText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
