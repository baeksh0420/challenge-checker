import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAppContext } from '../store/AppContext';
import { RootStackParamList, CheckIn } from '../types';
import { formatDate } from '../utils/fineCalculator';

type Route = RouteProp<RootStackParamList, 'CheckIn'>;

export default function CheckInScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { state, actions } = useAppContext();

  const [type, setType] = useState<'text' | 'photo'>('text');
  const [textContent, setTextContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const today = formatDate(new Date());

  const existingCheckIn = state.checkIns.find(
    (ci) =>
      ci.challengeId === route.params.challengeId &&
      ci.userId === state.currentUser?.id &&
      ci.date === today
  );

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
      quality: 0.7,
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
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (type === 'text' && !textContent.trim()) {
      Alert.alert('알림', '인증 내용을 입력해주세요.');
      return;
    }
    if (type === 'photo' && !imageUri) {
      Alert.alert('알림', '사진을 선택해주세요.');
      return;
    }

    if (!state.currentUser) return;

    const localUri = type === 'photo' ? imageUri! : undefined;
    const checkIn: CheckIn = {
      id: `checkin-${Date.now()}`,
      challengeId: route.params.challengeId,
      userId: state.currentUser.id,
      date: today,
      type,
      content: type === 'text' ? textContent.trim() : '',
      createdAt: new Date().toISOString(),
    };

    await actions.addCheckIn(checkIn, localUri);
    Alert.alert('완료', '오늘의 인증이 등록되었습니다!', [
      { text: '확인', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>오늘의 챌린지 인증</Text>
        <Text style={styles.dateText}>{today}</Text>

        {existingCheckIn && (
          <View style={styles.existingBanner}>
            <Text style={styles.existingText}>
              오늘 이미 인증했습니다. 다시 제출하면 기존 인증이 교체됩니다.
            </Text>
          </View>
        )}

        {/* 인증 타입 선택 */}
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'text' && styles.typeBtnActive]}
            onPress={() => setType('text')}
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
            />
            <Text style={styles.charCount}>{textContent.length}/500</Text>
          </View>
        ) : (
          <View style={styles.photoSection}>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                  <Text style={styles.photoBtnIcon}>📷</Text>
                  <Text style={styles.photoBtnText}>카메라</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                  <Text style={styles.photoBtnIcon}>🖼️</Text>
                  <Text style={styles.photoBtnText}>앨범</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>인증 완료</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelBtnText}>취소</Text>
        </TouchableOpacity>
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
    marginBottom: 20,
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
