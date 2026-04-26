import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../store/AppContext';
import { CheckIn, RootStackParamList } from '../types';
import ImagePreviewModal from '../components/ImagePreviewModal';
import ProfileAvatarButton from '../components/ProfileAvatarButton';
import { getChallengeParticipantAccent } from '../utils/participantColor';

type Route = RouteProp<RootStackParamList, 'ChallengeBoard'>;

function parseCreatedAt(ci: CheckIn): number {
  const t = Date.parse(ci.createdAt);
  return Number.isFinite(t) ? t : 0;
}

export default function ChallengeBoardScreen() {
  const route = useRoute<Route>();
  const { state, actions } = useAppContext();
  const challengeId = route.params.challengeId;
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);

  const challenge = state.challenges.find((c) => c.id === challengeId);
  const myId = state.currentUser?.id;

  const items = useMemo(() => {
    return state.checkIns
      .filter((ci) => ci.challengeId === challengeId)
      .sort((a, b) => parseCreatedAt(b) - parseCreatedAt(a));
  }, [state.checkIns, challengeId]);

  const getUser = (userId: string) => state.users.find((u) => u.id === userId);

  const handleReaction = (ci: CheckIn, type: 'thumbsUp' | 'sad') => {
    if (!myId) return;
    const list = ci.reactions?.[type] ?? [];
    const hasReacted = list.includes(myId);
    void actions.toggleCheckInReaction(ci.id, type, hasReacted);
  };

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
          const thumbsUpList = ci.reactions?.thumbsUp ?? [];
          const sadList = ci.reactions?.sad ?? [];
          const myThumbsUp = myId ? thumbsUpList.includes(myId) : false;
          const mySad = myId ? sadList.includes(myId) : false;

          return (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                {challenge ? (
                  <ProfileAvatarButton
                    user={author}
                    userId={ci.userId}
                    size={36}
                    initialBackgroundColor={getChallengeParticipantAccent(
                      challenge,
                      state.users,
                      ci.userId
                    )}
                  />
                ) : null}
                <View style={styles.cardHeadText}>
                  <Text style={styles.author} selectable>
                    {author?.name ?? '알 수 없음'}
                  </Text>
                  <Text style={styles.dateLine} selectable>
                    {ci.date} ·{' '}
                    {ci.type === 'photo'
                      ? ci.textNote
                        ? '사진 + 글'
                        : '사진'
                      : '텍스트'}
                  </Text>
                </View>
              </View>
              {ci.type === 'text' ? (
                <Text style={styles.body} selectable>
                  {String(ci.content ?? '')}
                </Text>
              ) : (
                <>
                  <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => setPhotoPreviewUri(ci.content)}
                    accessibilityLabel="사진 크게 보기"
                  >
                    <Image
                      source={{ uri: ci.content }}
                      style={styles.photo}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      recyclingKey={ci.id}
                      transition={150}
                    />
                  </TouchableOpacity>
                  {ci.textNote ? (
                    <Text style={[styles.body, styles.photoNote]} selectable>
                      {ci.textNote}
                    </Text>
                  ) : null}
                </>
              )}

              <View style={styles.reactionRow}>
                <TouchableOpacity
                  style={[
                    styles.reactionBtn,
                    myThumbsUp && styles.reactionBtnActive,
                  ]}
                  onPress={() => handleReaction(ci, 'thumbsUp')}
                  activeOpacity={0.7}
                >
                  <Ionicons name={myThumbsUp ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={myThumbsUp ? '#4F46E5' : '#9CA3AF'} />
                  {thumbsUpList.length > 0 ? (
                    <Text style={[styles.reactionCount, myThumbsUp && styles.reactionCountActive]}>
                      {thumbsUpList.length}
                    </Text>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.reactionBtn,
                    mySad && styles.reactionBtnActive,
                  ]}
                  onPress={() => handleReaction(ci, 'sad')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={mySad ? 'rainy' : 'rainy-outline'}
                    size={16}
                    color={mySad ? '#4F46E5' : '#9CA3AF'}
                  />
                  {sadList.length > 0 ? (
                    <Text
                      style={[
                        styles.reactionCount,
                        mySad && styles.reactionCountActive,
                      ]}
                    >
                      {sadList.length}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
      <ImagePreviewModal
        visible={!!photoPreviewUri}
        imageUri={photoPreviewUri}
        onClose={() => setPhotoPreviewUri(null)}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeadText: {
    flex: 1,
    minWidth: 0,
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
  photoNote: {
    marginTop: 10,
  },
  reactionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 4,
  },
  reactionBtnActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  reactionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  reactionCountActive: {
    color: '#4F46E5',
  },
});
