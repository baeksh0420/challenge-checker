import React, { useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { Challenge, RootStackParamList } from '../types';
import ChallengeCard from '../components/ChallengeCard';
import { challengeHasParticipant } from '../utils/challengeGuards';
import { isRecentEndedChallenge } from '../utils/challengeLifecycle';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Section = { title: string; data: Challenge[] };

export default function HomeScreen() {
  const { state } = useAppContext();
  const navigation = useNavigation<Nav>();

  const { activeChallenges, recentEndedChallenges } = useMemo(() => {
    const now = new Date();
    const my = state.challenges.filter((c) =>
      challengeHasParticipant(c, state.currentUser?.id)
    );
    const active = my.filter(
      (c) => now >= new Date(c.startDate) && now <= new Date(c.endDate)
    );
    const recent = my.filter((c) => isRecentEndedChallenge(c, now));
    return { activeChallenges: active, recentEndedChallenges: recent };
  }, [state.challenges, state.currentUser?.id]);

  const sections = useMemo((): Section[] => {
    const out: Section[] = [];
    if (activeChallenges.length > 0) {
      out.push({ title: '진행 중인 챌린지', data: activeChallenges });
    }
    if (recentEndedChallenges.length > 0) {
      out.push({ title: '최근 종료된 챌린지', data: recentEndedChallenges });
    }
    return out;
  }, [activeChallenges, recentEndedChallenges]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>챌린지체커</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
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
            <Text style={styles.emptyText}>표시할 챌린지가 없어요</Text>
            <Text style={styles.emptySubText}>
              진행 중·종료 후 일주일 이내 챌린이 여기에 나타나요.{'\n'}
              그 외는 프로필의「전체 챌린지」에서 볼 수 있어요.
            </Text>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
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
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
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
