import React, { useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { RootStackParamList, Challenge } from '../types';
import ChallengeCard from '../components/ChallengeCard';
import { challengeHasParticipant } from '../utils/challengeGuards';
import {
  formatLocalDate,
  getWeeklyProgressThisMondayWeek,
  needsDailyReminder,
  needsWeeklyReminder,
} from '../utils/fineCalculator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Row = { challenge: Challenge; subtitle: string; verificationComplete: boolean };

export default function MyChallengesScreen() {
  const { state } = useAppContext();
  const navigation = useNavigation<Nav>();

  const uid = state.currentUser?.id;
  const todayStr = formatLocalDate(new Date());

  const sections = useMemo(() => {
    if (!uid) {
      return [] as { title: string; data: Row[] }[];
    }

    const myChallenges = state.challenges.filter((c) => challengeHasParticipant(c, uid));
    const now = new Date();
    const active = myChallenges.filter((c) => {
      const s = new Date(`${c.startDate}T12:00:00`);
      const e = new Date(`${c.endDate}T12:00:00`);
      return now >= s && now <= e;
    });

    const daily = active.filter((c) => (c.fineMode ?? 'weekly') === 'daily');
    const weekly = active.filter((c) => (c.fineMode ?? 'weekly') === 'weekly');

    const dailyRows: Row[] = daily.map((c) => {
      const need = needsDailyReminder(c, uid, state.checkIns, todayStr);
      return {
        challenge: c,
        subtitle: need ? '오늘 인증 전 — 탭해서 인증하기' : '오늘 인증 완료',
        verificationComplete: !need,
      };
    });

    const weeklyRows: Row[] = weekly.map((c) => {
      const checkedToday = state.checkIns.some(
        (ci) =>
          ci.challengeId === c.id && ci.userId === uid && ci.date === todayStr
      );
      const weekNeed = needsWeeklyReminder(c, uid, state.checkIns, now);
      if (weekNeed) {
        const p = getWeeklyProgressThisMondayWeek(c, uid, state.checkIns, now);
        return {
          challenge: c,
          subtitle: checkedToday
            ? `오늘 인증 완료 · 이번 주 ${p.current}/${p.required}회 (월~일)`
            : `이번 주 인증 ${p.current}/${p.required}회 (월~일)`,
          verificationComplete: checkedToday,
        };
      }
      return {
        challenge: c,
        subtitle: '인증완료 (이번 주)',
        verificationComplete: true,
      };
    });

    const out: { title: string; data: Row[] }[] = [];
    if (dailyRows.length > 0) {
      out.push({ title: '일단위 챌린지', data: dailyRows });
    }
    if (weeklyRows.length > 0) {
      out.push({ title: '주단위 챌린지', data: weeklyRows });
    }
    return out;
  }, [uid, state.challenges, state.checkIns, todayStr]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>오늘인증</Text>
        <Text style={styles.headerHint}>
          일단위·주단위 챌린지별로 오늘·이번 주 인증 여부를 표시합니다
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.challenge.id}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeading}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <ChallengeCard
            challenge={item.challenge}
            subtitle={item.subtitle}
            verificationComplete={item.verificationComplete}
            hideFooter
            hideDescription
            hideStatusBadge
            onPress={() =>
              navigation.navigate('ChallengeDetail', { challengeId: item.challenge.id })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>진행 중인 챌린지가 없어요</Text>
            <Text style={styles.emptySubText}>
              홈에서 챌린지에 참여하거나 초대 코드로 들어와 보세요.
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
});
