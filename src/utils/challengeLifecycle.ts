import { Challenge } from '../types';
import { formatLocalDate } from './fineCalculator';

function addCalendarDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/** 종료일이 지났고, 종료일 포함 후 7일 이내(= 종료일+7일까지)인지 — 홈·상단 결과 블럭용 */
export function isRecentEndedChallenge(
  challenge: Challenge,
  ref: Date = new Date()
): boolean {
  const todayStr = formatLocalDate(ref);
  const endStr = challenge.endDate;
  if (todayStr <= endStr) return false;
  const lastShow = addCalendarDaysYmd(endStr, 7);
  return todayStr <= lastShow;
}
