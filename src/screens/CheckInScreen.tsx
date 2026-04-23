import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAppContext } from '../store/AppContext';
import { RootStackParamList, CheckIn } from '../types';
import { formatDate } from '../utils/fineCalculator';
import ImagePreviewModal from '../components/ImagePreviewModal';

type Route = RouteProp<RootStackParamList, 'CheckIn'>;

export default function CheckInScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { state, actions } = useAppContext();

  const [type, setType] = useState<'text' | 'photo'>('text');
  const [textContent, setTextContent] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkInDate = route.params.date ?? formatDate(new Date());
  const isPastOrToday = checkInDate <= formatDate(new Date());

  const existingCheckIn = useMemo(
    () =>
      state.checkIns.find(
        (ci) =>
          ci.challengeId === route.params.challengeId &&
          ci.userId === state.currentUser?.id &&
          ci.date === checkInDate
      ),
    [state.checkIns, route.params.challengeId, state.currentUser?.id, checkInDate]
  );

  useEffect(() => {
    const ex = state.checkIns.find(
      (ci) =>
        ci.challengeId === route.params.challengeId &&
        ci.userId === state.currentUser?.id &&
        ci.date === checkInDate
    );
    if (ex) {
      setType(ex.type);
      if (ex.type === 'text') {
        setTextContent(String(ex.content ?? ''));
        setImageUri(null);
      } else {
        setTextContent('');
        const url = String(ex.content ?? '');
        setImageUri(url.length > 0 ? url : null);
      }
    } else {
      setType('text');
      setTextContent('');
      setImageUri(null);
    }
    // 챌린지·인증일이 바뀔 때만 초기화 (전역 checkIns 스냅샷 변경 시 입력 유지)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- state.checkIns는 effect 내부에서만 최신 값으로 읽음
  }, [checkInDate, route.params.challengeId, state.currentUser?.id]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!isPastOrToday) {
      Alert.alert('알림', '오늘 이후 날짜에는 인증할 수 없습니다.');
      return;
    }
    if (type === 'text' && !textContent.trim()) {
      Alert.alert('알림', '인증 내용을 입력해주세요.');
      return;
    }
    if (type === 'photo' && !imageUri) {
      Alert.alert('알림', '사진을 선택해주세요.');
      return;
    }

    if (!state.currentUser) return;

    let localUri: string | undefined;
    let content = type === 'text' ? textContent.trim() : '';
    const captionTrim = photoCaption.trim();
    if (type === 'photo' && imageUri) {
      const isRemote = /^https?:\/\//i.test(imageUri);
      if (isRemote) {
        content = imageUri;
        localUri = undefined;
      } else {
        localUri = imageUri;
        content = '';
      }
    }

    const checkIn: CheckIn = {
      id: `checkin-${Date.now()}`,
      challengeId: route.params.challengeId,
      userId: state.currentUser.id,
      date: checkInDate,
      type,
      content,
      ...(type === 'photo' && captionTrim ? { textNote: captionTrim } : {}),
      createdAt: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      await actions.addCheckIn(checkIn, localUri);
      const isEdit = !!existingCheckIn;
      const doneMsg = isEdit
        ? '인증이 수정되었습니다.'
        : checkInDate === formatDate(new Date())
          ? '오늘의 인증이 등록되었습니다!'
          : `${checkInDate} 인증이 등록되었습니다!`;
      Alert.alert('완료', doneMsg, [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch {
      Alert.alert('오류', '인증 등록에 실패했습니다. 네트워크를 확인 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadingMessage =
    type === 'photo' ? '사진을 업로드하는 중…' : '인증을 등록하는 중…';

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={submitting} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.loadingBackdrop}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>챌린지 인증</Text>
        <Text style={styles.dateText}>인증일: {checkInDate}</Text>

        {existingCheckIn && (
          <View style={styles.existingBanner}>
            <Text style={styles.existingText}>
              이 날짜에 이미 인증했습니다. 다시 제출하면 기존 인증이 교체됩니다.
            </Text>
          </View>
        )}

        {/* 인증 타입 선택 */}
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'text' && styles.typeBtnActive]}
            onPress={() => setType('text')}
            disabled={submitting}
          >
            <Text
              style={[
                styles.typeBtnText,
                type === 'text' && styles.typeBtnTextActive,
              ]}
            >
              글 작성
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'photo' && styles.typeBtnActive]}
            onPress={() => setType('photo')}
            disabled={submitting}
          >
            <Text
              style={[
                styles.typeBtnText,
                type === 'photo' && styles.typeBtnTextActive,
              ]}
            >
              사진 인증
            </Text>
          </TouchableOpacity>
        </View>

        {type === 'text' ? (
          <View style={styles.field}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="오늘의 챌린지를 어떻게 수행했나요?"
              value={textContent}
              onChangeText={setTextContent}
              multiline
              maxLength={500}
              editable={!submitting}
            />
            <Text style={styles.charCount}>{textContent.length}/500</Text>
          </View>
        ) : (
          <View style={styles.photoSection}>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => setPhotoPreviewUri(imageUri)}
                  accessibilityLabel="사진 크�� 보기"
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.imagePreview}
                    contentFit="cover"
                    cachePolicy="none"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}
                  disabled={submitting}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} disabled={submitting}>
                  <Text style={styles.photoBtnIcon}>📷</Text>
                  <Text style={styles.photoBtnText}>카메라</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={pickImage} disabled={submitting}>
                  <Text style={styles.photoBtnIcon}>🖼️</Text>
                  <Text style={styles.photoBtnText}>앨범</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={[styles.field, styles.photoCaptionField]}>
              <Text style={styles.photoCaptionLabel}>함께 남길 글 (선택)</Text>
              <TextInput
                style={[styles.input, styles.textArea, styles.photoCaptionInput]}
                placeholder="사진과 함께 메모를 남길 수 있어요"
                value={photoCaption}
                onChangeText={setPhotoCaption}
                multiline
                maxLength={500}
                editable={!submitting}
              />
              <Text style={styles.charCount}>{photoCaption.length}/500</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>인증 완료</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text style={styles.cancelBtnText}>취소</Text>
        </TouchableOpacity>
      </ScrollView>

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
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 56,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  existingBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  existingText: {
    fontSize: 13,
    color: '#92400E',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#4F46E5',
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  field: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  photoSection: {
    marginBottom: 12,
  },
  photoCaptionField: {
    marginTop: 16,
    marginBottom: 0,
  },
  photoCaptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  photoCaptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 40,
    alignItems: 'center',
  },
  photoBtnIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  imagePreviewContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.65,
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
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
});
