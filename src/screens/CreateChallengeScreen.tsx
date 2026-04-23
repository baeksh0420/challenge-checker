import React, { useEffect, useState } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { RootStackParamList, Challenge } from '../types';
import { formatDate } from '../utils/fineCalculator';
import DatePickerModal from '../components/DatePickerModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CreateRoute = RouteProp<RootStackParamList, 'CreateChallenge'>;

function defaultEndDate(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + 27);
  return d;
}

function parseYmd(s: string): Date | null {
  const t = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function CreateChallengeScreen() {
  const { state, actions } = useAppContext();
  const navigation = useNavigation<Nav>();
  const route = useRoute<CreateRoute>();
  const editChallengeId = route.params?.editChallengeId;
  const editingChallenge = editChallengeId
    ? state.challenges.find((c) => c.id === editChallengeId)
    : undefined;

  const today = new Date();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(defaultEndDate(today));
  const [requiredDays, setRequiredDays] = useState('5');
  const [fineMode, setFineMode] = useState<'weekly' | 'daily'>('weekly');
  const [weeklyFineRule, setWeeklyFineRule] = useState<'flat' | 'perShortfall'>('flat');
  const [excludedDays, setExcludedDays] = useState<number[]>([]);
  const [fineAmount, setFineAmount] = useState('10000');
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (!editingChallenge) return;
    setTitle(editingChallenge.title);
    setDescription(editingChallenge.description ?? '');
    const sd = parseYmd(editingChallenge.startDate);
    const ed = parseYmd(editingChallenge.endDate);
    if (sd) setStartDate(sd);
    if (ed) setEndDate(ed);
    setRequiredDays(String(editingChallenge.requiredDaysPerWeek));
    setFineMode(editingChallenge.fineMode ?? 'weekly');
    setWeeklyFineRule(editingChallenge.weeklyFineRule ?? 'flat');
    setExcludedDays(editingChallenge.excludedDays ?? []);
    setFineAmount(String(editingChallenge.finePerMiss));
  }, [editingChallenge?.id]);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '챌린지 이름을 입력해주세요.');
      return;
    }
    if (!state.currentUser) return;

    if (editChallengeId && !editingChallenge) {
      Alert.alert('알림', '챌린지 정보를 불러올 수 없습니다.');
      return;
    }

    const startNorm = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endNorm = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    if (startNorm > endNorm) {
      Alert.alert('알림', '종료일이 시작일보다 빠를 수 없습니다.');
      return;
    }

    if (editChallengeId && editingChallenge) {
      const updated: Challenge = {
        ...editingChallenge,
        title: title.trim(),
        description: description.trim(),
        startDate: formatDate(startNorm),
        endDate: formatDate(endNorm),
        requiredDaysPerWeek: Math.min(parseInt(requiredDays, 10) || 5, 7),
        fineMode,
        ...(fineMode === 'weekly' ? { weeklyFineRule } : {}),
        excludedDays: fineMode === 'daily' ? excludedDays : [],
        finePerMiss: parseInt(fineAmount, 10) || 10000,
      };
      await actions.updateChallenge(updated);
      navigation.goBack();
      return;
    }

    const challenge: Challenge = {
      id: `challenge-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      creatorId: state.currentUser.id,
      startDate: formatDate(startNorm),
      endDate: formatDate(endNorm),
      requiredDaysPerWeek: Math.min(parseInt(requiredDays, 10) || 5, 7),
      fineMode,
      ...(fineMode === 'weekly' ? { weeklyFineRule } : {}),
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
        <Text style={styles.screenTitle}>
          {editChallengeId ? '챌린지 수정' : '새 챌린지 만들기'}
        </Text>

        <DatePickerModal
          visible={datePickerTarget === 'start'}
          value={startDate}
          maximumDate={endDate}
          onConfirm={(d) => {
            setStartDate(d);
            setDatePickerTarget(null);
          }}
          onCancel={() => setDatePickerTarget(null)}
        />
        <DatePickerModal
          visible={datePickerTarget === 'end'}
          value={endDate}
          minimumDate={startDate}
          onConfirm={(d) => {
            setEndDate(d);
            setDatePickerTarget(null);
          }}
          onCancel={() => setDatePickerTarget(null)}
        />

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

        <View style={styles.field}>
          <Text style={styles.label}>시작일 *</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setDatePickerTarget('start')}
            activeOpacity={0.8}
          >
            <Text style={styles.dateBtnText}>{formatDate(startDate)}</Text>
            <Text style={styles.dateBtnIcon}>📅</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>종료일 *</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setDatePickerTarget('end')}
            activeOpacity={0.8}
          >
            <Text style={styles.dateBtnText}>{formatDate(endDate)}</Text>
            <Text style={styles.dateBtnIcon}>📅</Text>
          </TouchableOpacity>
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
          <Text style={styles.modeHint}>
            {fineMode === 'weekly'
              ? '주당: 집계 주간은 월요일~일요일(기기 로컬 시간) 기준입니다.'
              : '일당: 제외하지 않은 요일에 인증하지 않으면 벌금이 적용됩니다.'}
          </Text>
        </View>

        {fineMode === 'weekly' ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>주당 필수 횟수 (이번 주 목표)</Text>
              <TextInput
                style={styles.input}
                value={requiredDays}
                onChangeText={setRequiredDays}
                keyboardType="number-pad"
                maxLength={1}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>주당 벌금 방식</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    weeklyFineRule === 'flat' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setWeeklyFineRule('flat')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      weeklyFineRule === 'flat' && styles.toggleBtnTextActive,
                    ]}
                  >
                    주 1회
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    weeklyFineRule === 'perShortfall' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setWeeklyFineRule('perShortfall')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      weeklyFineRule === 'perShortfall' &&
                        styles.toggleBtnTextActive,
                    ]}
                  >
                    부족 횟수당
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modeHint}>
                {weeklyFineRule === 'flat'
                  ? '한 주에 한 번이라도 목표에 못 미치면, 그 주 벌금이 1회 적용됩니다.'
                  : '마감된 각 주마다 (목표 − 실제 인증 일수)만큼 벌금이 곱해집니다.'}
              </Text>
            </View>
          </>
        ) : null}

        {fineMode === 'daily' ? (
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
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>
            {fineMode === 'weekly'
              ? weeklyFineRule === 'flat'
                ? '미달 시 주당 벌금 (원, 주당 1회)'
                : '미달 1회당 벌금 (원, 부족 횟수만큼 누적)'
              : '미달성 시 일당 벌금 (원)'}
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
          <Text style={styles.createBtnText}>
            {editChallengeId ? '변경 사항 저장' : '챌린지 생성'}
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 56,
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
  dateBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBtnText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  dateBtnIcon: {
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  modeHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    lineHeight: 17,
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
