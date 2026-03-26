import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { RootStackParamList, Challenge } from '../types';
import { formatDate } from '../utils/fineCalculator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CreateChallengeScreen() {
  const { state, actions } = useAppContext();
  const navigation = useNavigation<Nav>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('4');
  const [requiredDays, setRequiredDays] = useState('5');
  const [fineMode, setFineMode] = useState<'weekly' | 'daily'>('weekly');
  const [excludedDays, setExcludedDays] = useState<number[]>([]);
  const [fineAmount, setFineAmount] = useState('10000');

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '챌린지 이름을 입력해주세요.');
      return;
    }
    if (!state.currentUser) return;

    const weeks = parseInt(durationWeeks, 10) || 4;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + weeks * 7 - 1);

    const challenge: Challenge = {
      id: `challenge-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      creatorId: state.currentUser.id,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      requiredDaysPerWeek: Math.min(parseInt(requiredDays, 10) || 5, 7),
      fineMode,
      excludedDays: fineMode === 'daily' ? excludedDays : [],
      finePerMiss: parseInt(fineAmount, 10) || 10000,
      inviteCode: '',
      participants: [state.currentUser.id],
      createdAt: new Date().toISOString(),
    };

    await actions.createChallenge(challenge);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>새 챌린지 만들기</Text>

        <View style={styles.field}>
          <Text style={styles.label}>챌린지 이름 *</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 매일 운동하기"
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>설명</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="챌린지에 대한 설명을 적어주세요"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>기간 (주)</Text>
            <TextInput
              style={styles.input}
              value={durationWeeks}
              onChangeText={setDurationWeeks}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>주당 필수 횟수</Text>
            <TextInput
              style={styles.input}
              value={requiredDays}
              onChangeText={setRequiredDays}
              keyboardType="number-pad"
              maxLength={1}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>벌금 모드</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                fineMode === 'weekly' && styles.toggleBtnActive,
              ]}
              onPress={() => setFineMode('weekly')}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  fineMode === 'weekly' && styles.toggleBtnTextActive,
                ]}
              >
                주당 벌금
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                fineMode === 'daily' && styles.toggleBtnActive,
              ]}
              onPress={() => setFineMode('daily')}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  fineMode === 'daily' && styles.toggleBtnTextActive,
                ]}
              >
                일당 벌금
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {fineMode === 'daily' && (
          <View style={styles.field}>
            <Text style={styles.label}>제외 요일 (선택한 요일은 벌금 없음)</Text>
            <View style={styles.dayRow}>
              {['일', '월', '화', '수', '목', '금', '토'].map((label, idx) => {
                const isExcluded = excludedDays.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayBtn,
                      isExcluded && styles.dayBtnActive,
                    ]}
                    onPress={() => {
                      setExcludedDays((prev) =>
                        prev.includes(idx)
                          ? prev.filter((d) => d !== idx)
                          : [...prev, idx]
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.dayBtnText,
                        isExcluded && styles.dayBtnTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>
            미달성 시 {fineMode === 'weekly' ? '주당' : '일당'} 벌금 (원)
          </Text>
          <TextInput
            style={styles.input}
            value={fineAmount}
            onChangeText={setFineAmount}
            keyboardType="number-pad"
            maxLength={7}
          />
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Text style={styles.createBtnText}>챌린지 생성</Text>
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
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  createBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  createBtnText: {
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
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#4F46E5',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  dayRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  dayBtnActive: {
    backgroundColor: '#EF4444',
  },
  dayBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayBtnTextActive: {
    color: '#FFFFFF',
  },
});
