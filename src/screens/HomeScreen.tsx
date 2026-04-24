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
import { formatLocalDate } from '../utils/fineCalculator';
import { androidTopInsetStyle } from '../utils/androidTopInset';
import { Ionicons } from '@expo/vector-icons';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Section = { title: string; data: Challenge[] };

export default function HomeScreen() {
  const { state } = useAppContext();
  const navigation = useNavigation<Nav>();

  const { activeChallenges, recentEndedChallenges } = useMemo(() => {
    const now = new Date();
    const todayStr = formatLocalDate(now);
    const my = state.challenges.filter((c) =>
      challengeHasParticipant(c, state.currentUser?.id)
    );
    const active = my.filter(
      (c) => todayStr >= c.startDate && todayStr <= c.endDate
    );
    const recent = my.filter((c) => isRecentEndedChallenge(c, now));
    return { activeChallenges: active, recentEndedChallenges: recent };
  }, [state.challenges, state.currentUser?.id]);

  const sections = useMemo((): Section[] => {
    const out: Section[] = [];
    if (activeChallenges.length > 0) {
      out.push({ title: '참여중인 챌린지', data: activeChallenges });
    }
    if (recentEndedChallenges.length > 0) {
      out.push({ title: '최근 종료된 챌린지', data: recentEndedChallenges });
    }
    return out;
  }, [activeChallenges, recentEndedChallenges]);

  return (
    <SafeAreaView style={[styles.container, androidTopInsetStyle()]}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Challenge Checker</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => navigation.navigate('JoinByCode')}
            style={styles.iconBtn}
          >
            <Ionicons name="key-outline" size={22} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateChallenge')}
            style={styles.iconBtn}
          >
            <Ionicons name="add-circle-outline" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
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
            currentUserId={state.currentUser?.id}
            checkIns={state.checkIns}
            onPress={() =>
              navigation.navigate('ChallengeDetail', { challengeId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>표시할 챌린지가 없어요</Text>
            <Text style={styles.emptySubText}>
              진행 중·종료 후 일주일 이내 챌린이 여기에 나타나요.{'\n'}
              그 외는 프로필의「전체 챌린지」에서 볼 수 있어요.
            </Text>
          </View>
        }
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 6,
  },
  listContent: {
    paddingBottom: 24,
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
});
