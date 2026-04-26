import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';

type Props = {
  visible: boolean;
  value: Date | null;
  minimumDate?: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
};

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DAY_NAMES = ['월','화','수','목','금','토','일'];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** getDay()는 0=일. 월요일 시작으로 맞추기 위해 (day + 6) % 7 */
function mondayOffset(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export default function DatePickerModal({
  visible,
  value,
  minimumDate,
  maximumDate,
  onConfirm,
  onCancel,
}: Props) {
  const base = value ?? new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());
  const [selected, setSelected] = useState<Date | null>(value);

  useEffect(() => {
    if (visible) {
      const b = value ?? new Date();
      setViewYear(b.getFullYear());
      setViewMonth(b.getMonth());
      setSelected(value);
    }
  }, [visible]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const firstOffset = mondayOffset(new Date(viewYear, viewMonth, 1));
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();

  const isDisabled = (day: number): boolean => {
    const d = new Date(viewYear, viewMonth, day);
    if (minimumDate) {
      const min = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate());
      if (d < min) return true;
    }
    if (maximumDate) {
      const max = new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate());
      if (d > max) return true;
    }
    return false;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={prevMonth} hitSlop={12} style={styles.arrow}>
              <Text style={styles.arrowText}>{'‹'}</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{viewYear}년 {MONTH_NAMES[viewMonth]}</Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={12} style={styles.arrow}>
              <Text style={styles.arrowText}>{'›'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dayRow}>
            {DAY_NAMES.map((n) => (
              <Text key={n} style={styles.dayLabel}>{n}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) {
                return <View key={`e-${i}`} style={styles.cell} />;
              }
              const disabled = isDisabled(day);
              const dayDate = new Date(viewYear, viewMonth, day);
              const sel = selected ? sameDay(selected, dayDate) : false;
              const tod = sameDay(today, dayDate);
              return (
                <TouchableOpacity
                  key={`d-${day}`}
                  style={[styles.cell, sel && styles.cellSelected]}
                  onPress={() => setSelected(dayDate)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cellText,
                      tod && !sel && styles.cellTextToday,
                      sel && styles.cellTextSelected,
                      disabled && styles.cellTextDisabled,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
              onPress={() => selected && onConfirm(selected)}
              disabled={!selected}
            >
              <Text style={styles.confirmBtnText}>선택</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  arrow: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 28,
    color: '#4F46E5',
    lineHeight: 32,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  dayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    paddingBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  cellSelected: {
    backgroundColor: '#4F46E5',
    borderRadius: 100,
  },
  cellText: {
    fontSize: 14,
    color: '#374151',
  },
  cellTextToday: {
    fontWeight: '800',
    color: '#4F46E5',
  },
  cellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cellTextDisabled: {
    color: '#D1D5DB',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelBtnText: {
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
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
