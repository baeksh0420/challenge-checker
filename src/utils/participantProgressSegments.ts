import { Challenge, CheckIn } from '../types';
import {
  formatLocalDate,
  startOfLocalMondayWeek,
  getDatesBetween,
} from './fineCalculator';

/** 참여자 현황 막대: 완료 / 실패(마감 후 미달) / 대기 */
export type ProgressSegmentState = 'complete' | 'failed' | 'pending';

/** 일당: 의무일(제외 요일 제외)마다 한 칸 */
export function getDailyProgressSegments(
  challenge: Challenge,
  userId: string,
  checkIns: CheckIn[],
  refNow: Date = new Date()
): ProgressSegmentState[] {
  const todayStr = formatLocalDate(refNow);
  const excluded = new Set(challenge.excludedDays ?? []);
  const checkInDates = new Set(
    checkIns
      .filter((c) => c.challengeId === challenge.id && c.userId === userId)
      .map((c) => c.date)
  );
  const startD = new Date(`${challenge.startDate}T12:00:00`);
  const endD = new Date(`${challenge.endDate}T12:00:00`);
  const segments: ProgressSegmentState[] = [];
  const iter = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
  const last = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate());

  while (iter <= last) {
    if (!excluded.has(iter.getDay())) {
      const ds = formatLocalDate(iter);
      if (ds > todayStr) segments.push('pending');
      else if (ds === todayStr) segments.push(checkInDates.has(ds) ? 'complete' : 'pending');
      else segments.push(checkInDates.has(ds) ? 'complete' : 'failed');
    }
    iter.setDate(iter.getDate() + 1);
  }
  return segments;
}

/** 주당: 월~일 주 단위(챌린지 기간과 교집합) 한 칸 — 주가 끝난 뒤에만 성공/실패, 아니면 대기 */
export function getWeeklyProgressSegments(
  challenge: Challenge,
  userId: string,
  checkIns: CheckIn[],
  refNow: Date = new Date()
): ProgressSegmentState[] {
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
  const segments: ProgressSegmentState[] = [];
  let weekMon = startOfLocalMondayWeek(startD);

  while (true) {
    const ws = formatLocalDate(weekMon);
    if (ws > endStr) break;
    const sun = new Date(weekMon);
    sun.setDate(sun.getDate() + 6);
    const we = formatLocalDate(sun);
    const segStart = ws > startStr ? ws : startStr;
    const segEnd = we < endStr ? we : endStr;
    if (segStart <= segEnd) {
      let daysInWeek = 0;
      for (const ds of getDatesBetween(segStart, segEnd)) {
        if (checkInDates.has(ds)) daysInWeek++;
      }
      if (segEnd < todayStr) {
        segments.push(
          daysInWeek >= challenge.requiredDaysPerWeek ? 'complete' : 'failed'
        );
      } else {
        segments.push('pending');
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
