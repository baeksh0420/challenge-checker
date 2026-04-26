import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { RootStackParamList } from '../types';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COLOR_PALETTE = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#14B8A6', '#6366F1', '#A855F7',
];

export default function JoinByCodeScreen() {
  const { state, actions } = useAppContext();
  const navigation = useNavigation<Nav>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [joinedChallengeId, setJoinedChallengeId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(
    state.currentUser?.avatarColor ?? COLOR_PALETTE[3]
  );

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      Alert.alert('알림', '6자리 초대 코드를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const result = await actions.joinByCode(trimmed);
      if (result.success) {
        setJoinedChallengeId(result.challengeId ?? null);
        setSelectedColor(state.currentUser?.avatarColor ?? COLOR_PALETTE[3]);
        setColorPickerVisible(true);
      } else {
        Alert.alert('참여 실패', result.message);
      }
    } catch {
      Alert.alert('오류', '참여 처리 중 문제가 발생했습니다.');
    }
    setLoading(false);
  };

  const handleColorConfirm = async () => {
    if (joinedChallengeId) {
      try {
        await actions.updateParticipantColor(joinedChallengeId, selectedColor);
      } catch {
        // 색 저장 실패는 무시하고 진행
      }
    }
    setColorPickerVisible(false);
    navigation.goBack();
  };

  const handleColorSkip = () => {
    setColorPickerVisible(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>초대 코드로 참여</Text>
        <Text style={styles.subtitle}>
          챌린지 참여자에게 받은 6자리 코드를 입력하세요
        </Text>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="초대 코드 입력"
          placeholderTextColor="#9CA3AF"
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.joinBtn, loading && styles.joinBtnDisabled]}
          onPress={handleJoin}
          disabled={loading}
        >
          <Text style={styles.joinBtnText}>
            {loading ? '확인 중...' : '참여하기'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelBtnText}>취소</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <Modal
        visible={colorPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={handleColorSkip}
      >
        <Pressable style={styles.backdrop} onPress={() => {}}>
          <View style={styles.colorCard}>
            <Text style={styles.colorTitle}>내 캘린더 컬러 선택</Text>
            <Text style={styles.colorSubtitle}>
              이 챌린지에서 사용할 컬러를 선택하세요
            </Text>
            <View style={styles.palette}>
              {COLOR_PALETTE.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorDotSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                  activeOpacity={0.8}
                />
              ))}
            </View>
            <View style={styles.previewRow}>
              <View style={[styles.previewDot, { backgroundColor: selectedColor }]} />
              <Text style={styles.previewText}>선택된 컬러</Text>
            </View>
            <View style={styles.colorActions}>
              <TouchableOpacity style={styles.skipBtn} onPress={handleColorSkip}>
                <Text style={styles.skipBtnText}>건너뛰기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => void handleColorConfirm()}>
                <Text style={styles.confirmBtnText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 18 : 14,
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
  },
  joinBtn: {
    width: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinBtnDisabled: {
    opacity: 0.6,
  },
  joinBtnText: {
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  colorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    padding: 24,
  },
  colorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  colorSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#1F2937',
    transform: [{ scale: 1.15 }],
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  previewDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  previewText: {
    fontSize: 14,
    color: '#6B7280',
  },
  colorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
