import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getDaysInMonth, getFirstDayOfMonth } from '../utils/fineCalculator';

interface CalendarViewProps {
  checkedDates: Set<string>;
  challengeStart: string;
  challengeEnd: string;
  accentColor?: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarView({
  checkedDates,
  challengeStart,
  challengeEnd,
  accentColor = '#4F46E5',
}: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = `${year}년 ${month + 1}월`;

  const goToPrevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const goToNextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const renderDays = () => {
    const cells: React.ReactNode[] = [];

    // 빈 셀
    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isChecked = checkedDates.has(dateStr);
      const isToday = dateStr === today.toISOString().split('T')[0];
      const isInRange = dateStr >= challengeStart && dateStr <= challengeEnd;

      cells.push(
        <View key={day} style={styles.dayCell}>
          <View
            style={[
              styles.dayCircle,
              isChecked && { backgroundColor: accentColor },
              isToday && !isChecked && styles.todayCircle,
              !isInRange && styles.outOfRange,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                isChecked && styles.checkedDayText,
                isToday && !isChecked && { color: accentColor },
                !isInRange && styles.outOfRangeText,
              ]}
            >
              {day}
            </Text>
          </View>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  checkedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
