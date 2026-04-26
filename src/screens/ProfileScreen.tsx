import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '../store/AppContext';
import { androidTopInsetStyle } from '../utils/androidTopInset';
import ImagePreviewModal from '../components/ImagePreviewModal';
import ProfileMyChallengesTab from './profile/ProfileMyChallengesTab';
import ProfileResultSummaryTab from './profile/ProfileResultSummaryTab';

type ProfileTab = 'challenges' | 'summary';

function mapUpdateEmailError(code?: string): string {
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return '현재 비밀번호가 올바르지 않습니다.';
  }
  if (code === 'auth/email-already-in-use') {
    return '이미 다른 계정에서 사용 중인 이메일입니다.';
  }
  if (code === 'auth/invalid-email') return '올바른 이메일 형식이 아닙니다.';
  if (code === 'auth/requires-recent-login') {
    return '보안을 위해 다시 로그인한 뒤 시도해 주세요.';
  }
  if (code === 'auth/operation-not-allowed') {
    return '이메일 변경이 허용되지 않았습니다.';
  }
  return '이메일을 변경하지 못했습니다. 다시 시도해 주세요.';
}

export default function ProfileScreen() {
  const { state, actions } = useAppContext();
  const [name, setName] = useState(state.currentUser?.name ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(state.currentUser?.email ?? '');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoPreviewVisible, setPhotoPreviewVisible] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('challenges');

  useEffect(() => {
    setName(state.currentUser?.name ?? '');
  }, [state.currentUser?.id, state.currentUser?.name]);

  useEffect(() => {
    setEmailDraft(state.currentUser?.email ?? '');
  }, [state.currentUser?.id, state.currentUser?.email]);

  const handleSaveName = async () => {
    if (name.trim()) {
      await actions.updateUserName(name.trim());
    }
    setIsEditing(false);
  };

  const cancelEmailEdit = () => {
    setIsEditingEmail(false);
    setEmailPassword('');
    setEmailDraft(state.currentUser?.email ?? '');
  };

  const handleSaveEmail = async () => {
    const next = emailDraft.trim().toLowerCase();
    if (!next) {
      Alert.alert('이메일', '이메일 주소를 입력해 주세요.');
      return;
    }
    if (!emailPassword) {
      Alert.alert('이메일 변경', '본인 확인을 위해 현재 비밀번호를 입력해 주세요.');
      return;
    }
    if (next === (state.currentUser?.email ?? '').toLowerCase()) {
      Alert.alert('이메일 변경', '현재와 동일한 이메일입니다.');
      return;
    }
    setEmailBusy(true);
    try {
      await actions.updateUserEmail(next, emailPassword);
      setIsEditingEmail(false);
      setEmailPassword('');
      Alert.alert(
        '완료',
        '이메일이 변경되었습니다. 다음 로그인부터는 새 이메일(아이디)을 사용하세요.',
      );
    } catch (e) {
      const err = e as { code?: string };
      Alert.alert('이메일 변경 실패', mapUpdateEmailError(err.code));
    } finally {
      setEmailBusy(false);
    }
  };

  const openPhotoPicker = async () => {
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

  const handleAvatarPress = () => {
    if (state.currentUser?.photoURL) {
      Alert.alert('프로필 사진', undefined, [
        { text: '크게 보기', onPress: () => setPhotoPreviewVisible(true) },
        { text: '사진 변경', onPress: () => void openPhotoPicker() },
        { text: '취소', style: 'cancel' },
      ]);
    } else {
      void openPhotoPicker();
    }
  };

  return (
    <SafeAreaView style={[styles.container, androidTopInsetStyle()]}>
      <Modal visible={photoBusy} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.loadingBackdrop}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>
              사진을 최적화하고 업로드하는 중…
            </Text>
          </View>
        </View>
      </Modal>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.flex}>
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <TouchableOpacity
                style={[styles.avatarWrap, styles.avatarAlignSelf]}
                onPress={handleAvatarPress}
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
                        {
                          backgroundColor:
                            state.currentUser?.avatarColor ?? '#9CA3AF',
                        },
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

              <View style={styles.profileInfoCol}>
                <View style={styles.profileNameBlock}>
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
                    <View style={styles.nameDisplayRow}>
                      <Text
                        style={styles.userName}
                        selectable
                        numberOfLines={2}
                      >
                        {state.currentUser?.name ?? ''}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setIsEditingEmail(false);
                          setIsEditing(true);
                        }}
                        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                        activeOpacity={0.7}
                        accessibilityLabel="이름 변경"
                      >
                        <Ionicons name="pencil" size={13} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.emailSection}>
                    <Text style={styles.emailSectionLabel}>이메일 (아이디)</Text>
                    {isEditingEmail ? (
                      <View style={styles.emailEditBlock}>
                        <TextInput
                          style={styles.emailInput}
                          value={emailDraft}
                          onChangeText={setEmailDraft}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          autoComplete="email"
                          placeholder="새 이메일"
                          placeholderTextColor="#9CA3AF"
                          editable={!emailBusy}
                        />
                        <TextInput
                          style={styles.emailInput}
                          value={emailPassword}
                          onChangeText={setEmailPassword}
                          secureTextEntry
                          autoCapitalize="none"
                          placeholder="현재 비밀번호"
                          placeholderTextColor="#9CA3AF"
                          editable={!emailBusy}
                        />
                        <Text style={styles.emailHint}>
                          변경 후에는 새 이메일로 로그인합니다.
                        </Text>
                        <View style={styles.emailEditActions}>
                          <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={cancelEmailEdit}
                            disabled={emailBusy}
                          >
                            <Text style={styles.secondaryBtnText}>취소</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.saveBtn,
                              emailBusy && styles.btnDisabled,
                            ]}
                            onPress={() => void handleSaveEmail()}
                            disabled={emailBusy}
                          >
                            {emailBusy ? (
                              <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                              <Text style={styles.saveBtnText}>저장</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.emailDisplayRow}>
                        <Text
                          style={styles.userEmail}
                          selectable
                          numberOfLines={2}
                        >
                          {state.currentUser?.email ?? ''}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setIsEditing(false);
                            setEmailDraft(state.currentUser?.email ?? '');
                            setEmailPassword('');
                            setIsEditingEmail(true);
                          }}
                          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                          activeOpacity={0.7}
                          accessibilityLabel="이메일 변경"
                        >
                          <Ionicons name="pencil" size={13} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.logoutBar}>
              <TouchableOpacity
                style={styles.logoutBarBtn}
                onPress={() => {
                  Alert.alert('로그아웃', '정말 로그아웃할까요?', [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '로그아웃',
                      style: 'destructive',
                      onPress: () => {
                        void actions.signOut();
                      },
                    },
                  ]);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="로그아웃"
              >
                <Text style={styles.logoutBarText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabHit}
              onPress={() => setTab('challenges')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  tab === 'challenges' && styles.tabLabelActive,
                ]}
              >
                나의 챌린지
              </Text>
              {tab === 'challenges' ? (
                <View style={styles.tabUnderline} />
              ) : (
                <View style={styles.tabUnderlinePlaceholder} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabHit}
              onPress={() => setTab('summary')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  tab === 'summary' && styles.tabLabelActive,
                ]}
              >
                결과 요약
              </Text>
              {tab === 'summary' ? (
                <View style={styles.tabUnderline} />
              ) : (
                <View style={styles.tabUnderlinePlaceholder} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.tabPanel}>
            {tab === 'challenges' ? (
              <ProfileMyChallengesTab />
            ) : (
              <ProfileResultSummaryTab />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      <ImagePreviewModal
        visible={photoPreviewVisible}
        imageUri={state.currentUser?.photoURL}
        onClose={() => setPhotoPreviewVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  avatarAlignSelf: {
    alignSelf: 'flex-start',
  },
  avatarWrap: {
    marginRight: 14,
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
  profileInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  profileNameBlock: {
    flexShrink: 0,
  },
  logoutBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 12,
    marginTop: 4,
  },
  logoutBarBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  logoutBarText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
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
  nameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 6,
    maxWidth: '100%',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
    lineHeight: 26,
    includeFontPadding: false,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  nameInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 16,
    color: '#111827',
    minWidth: 120,
    flex: 1,
    maxWidth: '100%',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  emailSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  emailSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  emailDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  userEmail: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    includeFontPadding: false,
  },
  emailEditBlock: {
    gap: 8,
  },
  emailInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: '#111827',
  },
  emailHint: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 17,
  },
  emailEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 8,
  },
  tabHit: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 0,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
    paddingBottom: 10,
  },
  tabLabelActive: {
    color: '#111827',
    fontWeight: '700',
  },
  tabUnderline: {
    height: 3,
    width: '100%',
    backgroundColor: '#111827',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  tabUnderlinePlaceholder: {
    height: 3,
    width: '100%',
    backgroundColor: 'transparent',
  },
  tabPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
  },
});
