import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { Image } from 'expo-image';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAppContext } from '../store/AppContext';
import { CheckIn, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'ChallengeBoard'>;

function parseCreatedAt(ci: CheckIn): number {
  const t = Date.parse(ci.createdAt);
  return Number.isFinite(t) ? t : 0;
}

export default function ChallengeBoardScreen() {
  const route = useRoute<Route>();
  const { state } = useAppContext();
  const challengeId = route.params.challengeId;

  const challenge = state.challenges.find((c) => c.id === challengeId);

  const items = useMemo(() => {
    return state.checkIns
      .filter((ci) => ci.challengeId === challengeId)
      .sort((a, b) => parseCreatedAt(b) - parseCreatedAt(a));
  }, [state.checkIns, challengeId]);

  const getUser = (userId: string) => state.users.find((u) => u.id === userId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{challenge?.title ?? '게시판'}</Text>
        <Text style={styles.sub}>전체 참여자 인증 · 최신순</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          <Text style={styles.empty}>아직 인증 글이 없습니다.</Text>
        }
        renderItem={({ item: ci }) => {
          const author = getUser(ci.userId);
          return (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.author}>{author?.name ?? '알 수 없음'}</Text>
                <Text style={styles.dateLine}>
                  {ci.date} · {ci.type === 'photo' ? '사진' : '텍스트'}
                </Text>
              </View>
              {ci.type === 'text' ? (
                <Text style={styles.body}>{String(ci.content ?? '')}</Text>
              ) : (
                <Image
                  source={{ uri: ci.content }}
                  style={styles.photo}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={ci.id}
                  transition={150}
                />
              )}
            </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  sub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 44,
  },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 15,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHead: {
    marginBottom: 10,
  },
  author: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  dateLine: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  body: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
});
