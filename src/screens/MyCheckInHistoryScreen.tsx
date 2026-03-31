import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { useAppContext } from '../store/AppContext';
import { CheckIn } from '../types';

function parseCreated(ci: CheckIn): number {
  const t = Date.parse(ci.createdAt);
  return Number.isFinite(t) ? t : 0;
}

export default function MyCheckInHistoryScreen() {
  const { state } = useAppContext();
  const uid = state.currentUser?.id;

  const items = useMemo(() => {
    if (!uid) return [] as CheckIn[];
    return [...state.checkIns]
      .filter((ci) => ci.userId === uid)
      .sort((a, b) => parseCreated(b) - parseCreated(a));
  }, [state.checkIns, uid]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <Text style={styles.empty}>아직 인증 기록이 없습니다.</Text>
        ) : (
          items.map((ci) => {
            const challenge = state.challenges.find((c) => c.id === ci.challengeId);
            return (
              <View
                key={ci.id || `${ci.challengeId}-${ci.date}-${ci.userId}`}
                style={styles.card}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.chName}>
                    {challenge?.title ?? '알 수 없는 챌린지'}
                  </Text>
                  <Text style={styles.date}>{ci.date}</Text>
                </View>
                {ci.type === 'text' ? (
                  <Text style={styles.body}>{String(ci.content ?? '')}</Text>
                ) : (
                  <>
                    <Image
                      source={{ uri: ci.content }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  </>
                )}
              </View>
            );
          })
        )}
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
  empty: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 48,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHead: {
    marginBottom: 8,
  },
  chName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  body: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginTop: 4,
  },
});
