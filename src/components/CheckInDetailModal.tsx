import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { CheckIn, RootStackParamList } from '../types';
import ProfileAvatarButton from './ProfileAvatarButton';
import { getChallengeParticipantAccent } from '../utils/participantColor';

function formatCheckInDateYmd(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parts[0]!.trim();
    const mo = String(parseInt(parts[1]!, 10)).padStart(2, '0');
    const d = String(parseInt(parts[2]!, 10)).padStart(2, '0');
    if (/^\d{4}$/.test(y)) return `${y}-${mo}-${d}`;
  }
  return dateStr;
}

function formatModifiedTime(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${h}:${min}`;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  checkIn: CheckIn | null;
  onClose: () => void;
};

export default function CheckInDetailModal({ checkIn, onClose }: Props) {
  const { state, actions } = useAppContext();
  const navigation = useNavigation<Nav>();
  const uid = state.currentUser?.id;

  const getUser = useCallback(
    (userId: string) => state.users.find((u) => u.id === userId),
    [state.users],
  );

  const detailAuthor = checkIn ? getUser(checkIn.userId) : null;
  const isDetailSelf = !!uid && !!checkIn && checkIn.userId === uid;
  const thumbsList = checkIn?.reactions?.thumbsUp ?? [];
  const sadList = checkIn?.reactions?.sad ?? [];
  const myThumbsUp = uid ? thumbsList.includes(uid) : false;
  const mySad = uid ? sadList.includes(uid) : false;

  const detailAvatarAccent = (() => {
    if (!checkIn) return '#6B7280';
    const ch = state.challenges.find((c) => c.id === checkIn.challengeId);
    if (!ch) return '#6B7280';
    return getChallengeParticipantAccent(ch, state.users, checkIn.userId);
  })();

  const handleReaction = (ci: CheckIn, type: 'thumbsUp' | 'sad') => {
    if (!uid) return;
    const list = ci.reactions?.[type] ?? [];
    void actions.toggleCheckInReaction(ci.id, type, list.includes(uid));
  };

  const topInset =
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 52;

  return (
    <Modal
      visible={!!checkIn}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={[styles.modalCloseBtn, { top: topInset }]}
          onPress={onClose}
          hitSlop={14}
        >
          <Text style={styles.modalCloseBtnText}>✕</Text>
        </Pressable>

        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <Pressable onPress={() => {}} style={styles.modalCard}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                {checkIn ? (
                  <ProfileAvatarButton
                    user={detailAuthor ?? undefined}
                    userId={checkIn.userId}
                    size={40}
                    initialBackgroundColor={detailAvatarAccent}
                    beforeNavigate={onClose}
                  />
                ) : null}
                <View style={styles.modalHeaderTextBlock}>
                  <Text style={styles.modalAuthor} selectable>
                    {detailAuthor?.name ?? '알 수 없음'}
                  </Text>
                  <Text style={styles.modalDate} selectable>
                    {checkIn ? formatCheckInDateYmd(checkIn.date) : ''}
                  </Text>
                </View>
              </View>

              {isDetailSelf && checkIn ? (
                <View style={styles.modalOwnRow}>
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      navigation.navigate('CheckIn', {
                        challengeId: checkIn.challengeId,
                        date: checkIn.date,
                      });
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalEditLabel}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('인증 삭제', '이 인증을 삭제할까요?', [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '삭제',
                          style: 'destructive',
                          onPress: () => {
                            void actions.deleteCheckIn(checkIn);
                            onClose();
                          },
                        },
                      ])
                    }
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalDeleteLabel}>삭제</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {checkIn?.type === 'photo' ? (
                <>
                  <Image
                    source={{ uri: checkIn.content }}
                    style={styles.modalImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                  {checkIn.textNote ? (
                    <Text style={styles.modalText} selectable>
                      {checkIn.textNote}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.modalTextFull} selectable>
                  {String(checkIn?.content ?? '')}
                </Text>
              )}

              <View style={styles.modalReactionRow}>
                <TouchableOpacity
                  style={[
                    styles.reactionBtn,
                    myThumbsUp && styles.reactionBtnActive,
                  ]}
                  onPress={() => checkIn && handleReaction(checkIn, 'thumbsUp')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={myThumbsUp ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={18}
                    color={myThumbsUp ? '#4F46E5' : '#9CA3AF'}
                  />
                  {thumbsList.length > 0 && (
                    <Text
                      style={[
                        styles.reactionCount,
                        myThumbsUp && styles.reactionCountActive,
                      ]}
                    >
                      {thumbsList.length}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reactionBtn, mySad && styles.reactionBtnActive]}
                  onPress={() => checkIn && handleReaction(checkIn, 'sad')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={mySad ? 'rainy' : 'rainy-outline'}
                    size={18}
                    color={mySad ? '#4F46E5' : '#9CA3AF'}
                  />
                  {sadList.length > 0 && (
                    <Text
                      style={[
                        styles.reactionCount,
                        mySad && styles.reactionCountActive,
                      ]}
                    >
                      {sadList.length}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {checkIn?.createdAt ? (
                <Text style={styles.modalModTime} selectable>
                  수정 {formatModifiedTime(checkIn.createdAt)}
                </Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    padding: 20,
  },
  modalCloseBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '300',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  modalHeaderTextBlock: { flex: 1, minWidth: 0 },
  modalAuthor: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  modalDate: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  modalOwnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  modalEditLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  modalDeleteLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  modalImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  modalText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginTop: 12,
  },
  modalTextFull: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  modalReactionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
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
  reactionCount: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  reactionCountActive: { color: '#4F46E5' },
  modalModTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
  },
});
