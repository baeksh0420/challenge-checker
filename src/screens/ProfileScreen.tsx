import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { formatLocalDate } from '../utils/fineCalculator';
import { MainTabParamList, RootStackParamList } from '../types';
import { challengeHasParticipant } from '../utils/challengeGuards';
import { androidTopInsetStyle } from '../utils/androidTopInset';

/** 프로필은 탭 + 상위 스택(상세·전체목록 등) 모두 사용 */
type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function ProfileScreen() {
  const { state, actions } = useAppContext();
  const navigation = useNavigation<ProfileNav>();
  const [name, setName] = useState(state.currentUser?.name ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    setName(state.currentUser?.name ?? '');
  }, [state.currentUser?.id, state.currentUser?.name]);

  const myChallenges = useMemo(
    () =>
      state.challenges.filter((c) =>
        challengeHasParticipant(c, state.currentUser?.id)
      ),
    [state.challenges, state.currentUser?.id]
  );
  const myCheckIns = useMemo(
    () =>
      state.checkIns.filter((ci) => ci.userId === state.currentUser?.id),
    [state.checkIns, state.currentUser?.id]
  );

  const totalCheckIns = myCheckIns.length;
  const activeChallenges = myChallenges.filter((c) => {
    const todayStr = formatLocalDate(new Date());
    return todayStr >= c.startDate && todayStr <= c.endDate;
  }).length;

  const handleSaveName = async () => {
    if (name.trim()) {
      await actions.updateUserName(name.trim());
    }
    setIsEditing(false);
  };

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '갤러리 접근을 허용해 주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setPhotoBusy(true);
    try {
      await actions.updateUserPhoto(result.assets[0].uri);
    } catch (e) {
      const err = e as { message?: string };
      Alert.alert('업로드 실패', err.message ?? '다시 시도해 주세요.');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, androidTopInsetStyle()]}>
      <Modal visible={photoBusy} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.loadingBackdrop}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>
              사진을 최적화하고 업로드하는 중…
            </Text>
          </View>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.headerTitle}>프로필</Text>

          <View style={styles.profileCard}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handlePickPhoto}
              disabled={photoBusy}
              activeOpacity={0.85}
            >
              <View style={styles.avatarInner}>
                {state.currentUser?.photoURL ? (
                  <Image
                    source={{ uri: state.currentUser.photoURL }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    recyclingKey={state.currentUser.id}
                    transition={120}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: state.currentUser?.avatarColor ?? '#9CA3AF' },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {state.currentUser?.name?.[0] ?? '?'}
                    </Text>
                  </View>
                )}
                {photoBusy ? (
                  <View style={styles.avatarBusy}>
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>프로필 사진 탭하여 변경</Text>

            {isEditing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  maxLength={20}
                />
                <TouchableOpacity
                  style={[styles.saveBtn, { marginLeft: 8 }]}
                  onPress={handleSaveName}
                >
                  <Text style={styles.saveBtnText}>저장</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.userName}>{state.currentUser?.name ?? ''}</Text>
                <Text style={styles.editHint}>탭하여 이름 변경</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statBox}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AllMyChallenges')}
            >
              <Text style={styles.statNumber}>{myChallenges.length}</Text>
              <Text style={styles.statLabel}>전체 챌린지</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statBox}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.statNumber}>{activeChallenges}</Text>
              <Text style={styles.statLabel}>진행 중</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statBox}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MyCheckInHistory')}
            >
              <Text style={styles.statNumber}>{totalCheckIns}</Text>
              <Text style={styles.statLabel}>내 인증내역</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              void actions.signOut();
            }}
          >
            <Text style={styles.logoutBtnText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrap: {
    marginBottom: 4,
  },
  avatarInner: {
    width: 72,
    height: 72,
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E5E7EB',
  },
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    maxWidth: 280,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  photoHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  editHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 16,
    color: '#1F2937',
    minWidth: 120,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    marginHorizontal: -6,
  },
  statBox: {
    flex: 1,
    marginHorizontal: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4F46E5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  logoutBtn: {
    marginTop: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
