import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { CheckIn, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function parseCreated(ci: CheckIn): number {
  const t = Date.parse(ci.createdAt);
  return Number.isFinite(t) ? t : 0;
}

export default function MyCheckInHistoryScreen() {
  const { state, actions } = useAppContext();
  const navigation = useNavigation<Nav>();
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
                <View style={styles.cardHeadRow}>
                  <View style={styles.cardHeadMain}>
                    <Text style={styles.chName}>
                      {challenge?.title ?? '알 수 없는 챌린지'}
                    </Text>
                    <Text style={styles.date}>{ci.date}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionHit}
                      onPress={() =>
                        navigation.navigate('CheckIn', {
                          challengeId: ci.challengeId,
                          date: ci.date,
                        })
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.editLabel}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionHit}
                      onPress={() =>
                        Alert.alert('인증 삭제', '이 인증을 삭제할까요?', [
                          { text: '취소', style: 'cancel' },
                          {
                            text: '삭제',
                            style: 'destructive',
                            onPress: () => void actions.deleteCheckIn(ci),
                          },
                        ])
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.deleteLabel}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {ci.type === 'text' ? (
                  <Text style={styles.body}>{String(ci.content ?? '')}</Text>
                ) : (
                  <>
                    <Image
                      source={{ uri: ci.content }}
                      style={styles.photo}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      recyclingKey={ci.id}
                      transition={150}
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
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 56,
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
  cardHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  cardHeadMain: {
    flex: 1,
    minWidth: 0,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionHit: {
    paddingVertical: 2,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  deleteLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
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
