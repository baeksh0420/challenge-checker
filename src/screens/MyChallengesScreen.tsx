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

export default function MyChallengesScreen() {
  const { state } = useAppContext();
  const navigation = useNavigation<Nav>();

  const myChallenges = state.challenges.filter((c) =>
    c.participants.includes(state.currentUser.id)
  );

  const activeChallenges = myChallenges.filter((c) => {
    const now = new Date();
    return now >= new Date(c.startDate) && now <= new Date(c.endDate);
  });

  const endedChallenges = myChallenges.filter(
    (c) => new Date() > new Date(c.endDate)
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>내 챌린지</Text>
      </View>

      <FlatList
        data={[...activeChallenges, ...endedChallenges]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>참여 중인 챌린지가 없어요</Text>
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
  },
  listContent: {
    paddingBottom: 40,
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
  },
});
