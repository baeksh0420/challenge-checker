import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { Challenge, RootStackParamList } from '../types';
import { challengeHasParticipant } from '../utils/challengeGuards';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function BoardListScreen() {
  const { state } = useAppContext();
  const navigation = useNavigation<Nav>();
  const uid = state.currentUser?.id;

  const rows = useMemo(() => {
    if (!uid) return [] as Challenge[];
    return state.challenges.filter((c) => challengeHasParticipant(c, uid));
  }, [state.challenges, uid]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>게시판</Text>
        <Text style={styles.headerHint}>참여 중인 챌린지의 인증 피드를 볼 수 있어요</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>참여 중인 챌린지가 없습니다</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('ChallengeBoard', { challengeId: item.id })}
            activeOpacity={0.7}
          >
            <View style={styles.rowInner}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.rowSub}>
                {item.startDate} ~ {item.endDate}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}
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
    paddingBottom: 12,
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
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  rowInner: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  rowSub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
  },
  empty: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
});
