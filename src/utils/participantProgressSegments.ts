import { Challenge, CheckIn } from '../types';
import {
  formatLocalDate,
  startOfLocalMondayWeek,
  getDatesBetween,
} from './fineCalculator';

/** 참여자 현황 막대: 완료 / 실패(마감 후 미달) / 대기 */
export type ProgressSegmentState = 'complete' | 'failed' | 'pending';

export type ProgressSegment = {
  state: ProgressSegmentState;
  /** 일당: 오늘 의무일 칸. 주당: `today`가 해당 주 구간(월~일)에 포함되는 칸 */
  isCurrentFocus: boolean;
};

/** 일당: 의무일(제외 요일 제외)마다 한 칸 */
export function getDailyProgressSegments(
  challenge: Challenge,
  userId: string,
  checkIns: CheckIn[],
  refNow: Date = new Date()
): ProgressSegment[] {
  const todayStr = formatLocalDate(refNow);
  const excluded = new Set(challenge.excludedDays ?? []);
  const checkInDates = new Set(
    checkIns
      .filter((c) => c.challengeId === challenge.id && c.userId === userId)
      .map((c) => c.date)
  );
  const startD = new Date(`${challenge.startDate}T12:00:00`);
  const endD = new Date(`${challenge.endDate}T12:00:00`);
  const segments: ProgressSegment[] = [];
  const iter = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
  const last = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate());

  while (iter <= last) {
    if (!excluded.has(iter.getDay())) {
      const ds = formatLocalDate(iter);
      const isToday = ds === todayStr;
      if (ds > todayStr) {
        segments.push({ state: 'pending', isCurrentFocus: isToday });
      } else if (isToday) {
        segments.push({
          state: checkInDates.has(ds) ? 'complete' : 'pending',
          isCurrentFocus: true,
        });
      } else {
        segments.push({
          state: checkInDates.has(ds) ? 'complete' : 'failed',
          isCurrentFocus: false,
        });
      }
    }
    iter.setDate(iter.getDate() + 1);
  }
  return segments;
}

/**
 * 주당: 월~일 주 단위(챌린지 기간과 교집합) 한 칸.
 * - 그 주(챌린지 구간)에 인증한 날 수가 `requiredDaysPerWeek` 이상이면 `complete` (이번 주 진행 중에도 색칠).
 * - 그 주의 일요일(또는 챌린지 마지막날)이 `today`보다 앞이면, 이미 끝난 주 → 미달이면 `failed`.
 */
export function getWeeklyProgressSegments(
  challenge: Challenge,
  userId: string,
  checkIns: CheckIn[],
  refNow: Date = new Date()
): ProgressSegment[] {
  const todayStr = formatLocalDate(refNow);
  const checkInDates = new Set(
    checkIns
      .filter((c) => c.challengeId === challenge.id && c.userId === userId)
      .map((c) => c.date)
  );
  const startD = new Date(`${challenge.startDate}T12:00:00`);
  const endD = new Date(`${challenge.endDate}T12:00:00`);
  const startStr = formatLocalDate(startD);
  const endStr = formatLocalDate(endD);
  const segments: ProgressSegment[] = [];
  let weekMon = startOfLocalMondayWeek(startD);
  const required = challenge.requiredDaysPerWeek;

  while (true) {
    const ws = formatLocalDate(weekMon);
    if (ws > endStr) break;
    const sun = new Date(weekMon);
    sun.setDate(sun.getDate() + 6);
    const we = formatLocalDate(sun);
    const segStart = ws > startStr ? ws : startStr;
    const segEnd = we < endStr ? we : endStr;
    if (segStart <= segEnd) {
      const isThisWeek = segStart <= todayStr && todayStr <= segEnd;
      let daysInWeek = 0;
      for (const ds of getDatesBetween(segStart, segEnd)) {
        if (checkInDates.has(ds)) daysInWeek++;
      }
      const met = daysInWeek >= required;
      if (segEnd < todayStr) {
        segments.push({
          state: met ? 'complete' : 'failed',
          isCurrentFocus: false,
        });
      } else {
        segments.push({
          state: met ? 'complete' : 'pending',
          isCurrentFocus: isThisWeek,
        });
      }
    }
    weekMon.setDate(weekMon.getDate() + 7);
  }
  return segments;
}

export function segmentBarColor(
  state: ProgressSegmentState,
  completeColor: string
): string {
  switch (state) {
    case 'complete':
      return completeColor;
    case 'failed':
      return '#111827';
    default:
      return '#E5E7EB';
  }
}

export function segmentCurrentFocusPendingColor(completeColor: string): string {
  const hex = completeColor.replace('#', '');
  if (hex.length !== 6) return 'rgba(79, 70, 229, 0.27)';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.27)`;
}
