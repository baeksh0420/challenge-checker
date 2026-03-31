import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  formatLocalDate,
} from '../utils/fineCalculator';

interface CalendarViewProps {
  checkedDates: Set<string>;
  challengeStart: string;
  challengeEnd: string;
  accentColor?: string;
  /** 인증 완료된 날짜 탭 시 (전체 인증 내역 모달 등) */
  onPressCheckedDate?: (dateStr: string) => void;
  /** 기간 내·아직 인증 없는 날 탭 시 (과거/오늘 보충 인증 등) */
  onPressUncheckedInRangeDate?: (dateStr: string) => void;
}

/** 달력 헤더: 주는 월~일 기준으로 표시 (월요일 시작) */
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export default function CalendarView({
  checkedDates,
  challengeStart,
  challengeEnd,
  accentColor = '#4F46E5',
  onPressCheckedDate,
  onPressUncheckedInRangeDate,
}: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  /** JS getDay: 일=0 … 토=6 → 월요일 시작 그리드용 왼쪽 패딩 */
  const leadingEmpty = (firstDay + 6) % 7;
  const monthName = `${year}년 ${month + 1}월`;

  const goToPrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else setMonth(month - 1);
  };
  const goToNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else setMonth(month + 1);
  };

  const renderDays = () => {
    const cells: React.ReactNode[] = [];

    for (let i = 0; i < leadingEmpty; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    const todayStr = formatLocalDate(today);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isChecked = checkedDates.has(dateStr);
      const isToday = dateStr === todayStr;
      const isInRange = dateStr >= challengeStart && dateStr <= challengeEnd;

      const circle = (
        <View
          style={[
            styles.dayCircle,
            isChecked && {
              borderWidth: 2,
              borderColor: accentColor,
              backgroundColor: '#FFFFFF',
            },
            isToday && !isChecked && isInRange && styles.todayCircle,
            !isInRange && styles.outOfRange,
          ]}
        >
          {isChecked ? (
            <>
              <Text
                style={[
                  styles.dayNumWithCheck,
                  { color: accentColor },
                  !isInRange && styles.outOfRangeText,
                ]}
              >
                {day}
              </Text>
              <Ionicons name="checkmark" size={13} color={accentColor} />
            </>
          ) : (
            <Text
              style={[
                styles.dayText,
                isToday && isInRange && { color: accentColor, fontWeight: '700' },
                !isInRange && styles.outOfRangeText,
              ]}
            >
              {day}
            </Text>
          )}
        </View>
      );

      const canPressChecked =
        isInRange && isChecked && typeof onPressCheckedDate === 'function';
      const canPressUnchecked =
        isInRange &&
        !isChecked &&
        typeof onPressUncheckedInRangeDate === 'function';

      cells.push(
        <View key={day} style={styles.dayCell}>
          {canPressChecked ? (
            <TouchableOpacity
              onPress={() => onPressCheckedDate?.(dateStr)}
              accessibilityRole="button"
              accessibilityLabel={`${dateStr} 인증 내역`}
            >
              {circle}
            </TouchableOpacity>
          ) : canPressUnchecked ? (
            <TouchableOpacity
              onPress={() => onPressUncheckedInRangeDate?.(dateStr)}
              accessibilityRole="button"
              accessibilityLabel={`${dateStr} 인증하기`}
            >
              {circle}
            </TouchableOpacity>
          ) : (
            circle
          )}
        </View>
      );
    }

    return cells;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.arrowBtn}>
          <Text style={styles.arrow}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthName}</Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.arrowBtn}>
          <Text style={styles.arrow}>▶</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((wd) => (
          <View key={wd} style={styles.dayCell}>
            <Text style={styles.weekdayText}>{wd}</Text>
          </View>
        ))}
      </View>

      <View style={styles.daysGrid}>{renderDays()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  arrowBtn: {
    padding: 8,
  },
  arrow: {
    fontSize: 16,
    color: '#4B5563',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dayNumWithCheck: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  outOfRange: {
    opacity: 0.3,
  },
  outOfRangeText: {
    color: '#9CA3AF',
  },
});
