import React, { useMemo } from 'react';
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
import { Challenge, RootStackParamList } from '../types';
import { challengeHasParticipant } from '../utils/challengeGuards';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function challengeStatus(c: Challenge): { label: string; color: string } {
  const now = new Date();
  const s = new Date(`${c.startDate}T12:00:00`);
  const e = new Date(`${c.endDate}T12:00:00`);
  if (now < s) return { label: '예정', color: '#F59E0B' };
  if (now > e) return { label: '종료', color: '#6B7280' };
  return { label: '진행 중', color: '#10B981' };
}

export default function AllMyChallengesScreen() {
  const { state } = useAppContext();
  const navigation = useNavigation<Nav>();
  const uid = state.currentUser?.id;

  const rows = useMemo(() => {
    if (!uid) return [] as Challenge[];
    return state.challenges
      .filter((c) => challengeHasParticipant(c, uid))
      .sort((a, b) => {
        const ae = new Date(`${a.endDate}T12:00:00`).getTime();
        const be = new Date(`${b.endDate}T12:00:00`).getTime();
        return be - ae;
      });
  }, [state.challenges, uid]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.hint}>지금까지 참여했거나 참여 중인 챌린지입니다.</Text>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>참여한 챌린지가 없습니다.</Text>
        }
        renderItem={({ item }) => {
          const st = challengeStatus(item);
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                navigation.navigate('ChallengeDetail', { challengeId: item.id })
              }
              activeOpacity={0.75}
            >
              <View style={styles.rowTop}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={[styles.badge, { backgroundColor: st.color + '22' }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                {item.startDate} ~ {item.endDate} ·{' '}
                {(item.fineMode ?? 'weekly') === 'daily' ? '일단위' : '주단위'}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  hint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 56,
  },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 15,
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
