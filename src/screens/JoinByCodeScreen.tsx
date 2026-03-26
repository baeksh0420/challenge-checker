import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function JoinByCodeScreen() {
  const { actions } = useAppContext();
  const navigation = useNavigation<Nav>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

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
        Alert.alert('참여 완료', result.message, [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('참여 실패', result.message);
      }
    } catch {
      Alert.alert('오류', '참여 처리 중 문제가 발생했습니다.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
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
});
