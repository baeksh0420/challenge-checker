import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  Alert,
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

/** 버그·기능 제보 메일 받는 주소 */
const FEEDBACK_EMAIL = 'baeksh.0420@gmail.com';

export default function HomeScreen() {
  const { state } = useAppContext();
  const navigation = useNavigation<Nav>();

  const openFeedbackMail = useCallback(async () => {
    const subject = encodeURIComponent('[챌린지체커] 버그·기능 제보');
    const body = encodeURIComponent(
      [
        '(제보 내용을 적어 주세요. 스크린샷이 있으면 첨부해 주세요.)',
        '',
        '────────',
        `로그인 이메일: ${state.currentUser?.email ?? '-'}`,
      ].join('\n'),
    );
    const url = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        '메일을 열 수 없습니다',
        '기기에 메일 앱이 설정되어 있는지 확인해 주세요.',
      );
    }
  }, [state.currentUser?.email]);

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
              그 외는 프로필 탭의「나의 챌린지」에서 볼 수 있어요.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.feedbackFooter}>
            <TouchableOpacity
              style={styles.feedbackBtn}
              onPress={() => void openFeedbackMail()}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="버그 및 기능 제보"
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerTitle: {
    flexShrink: 1,
    marginRight: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.2,
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
    paddingBottom: 16,
    flexGrow: 1,
  },
  feedbackFooter: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
    alignItems: 'flex-end',
  },
  feedbackBtn: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
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
