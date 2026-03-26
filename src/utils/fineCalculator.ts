import { Challenge, CheckIn, User } from '../types';

/**
 * 벌금 계산 결과 타입
 */
export interface FineResult {
  totalFine: number;
  missedWeeks: number;
  totalWeeks: number;
  missedDays: number;
  totalDays: number;
  fineMode: 'weekly' | 'daily';
}

/**
 * 특정 기간 내 주별/일별 달성 횟수를 계산하고 벌금을 산정합니다.
 */
export function calculateFine(
  challenge: Challenge,
  userId: string,
  checkIns: CheckIn[]
): FineResult {
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);
  const now = new Date();
  const effectiveEnd = now < end ? now : end;
  const fineMode = challenge.fineMode ?? 'weekly';

  const userCheckIns = checkIns.filter(
    (c) => c.challengeId === challenge.id && c.userId === userId
  );
  const checkInDates = new Set(userCheckIns.map((c) => c.date));
  const excludedDays = new Set(challenge.excludedDays ?? []);

  // 주별 통계 (주당 벌금 모드용)
  let totalWeeks = 0;
  let missedWeeks = 0;
  let weekStart = new Date(start);

  while (weekStart <= effectiveEnd) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const effectiveWeekEnd = weekEnd > effectiveEnd ? effectiveEnd : weekEnd;

    let daysInWeek = 0;
    const day = new Date(weekStart);
    while (day <= effectiveWeekEnd) {
      const dateStr = day.toISOString().split('T')[0];
      if (checkInDates.has(dateStr)) {
        daysInWeek++;
      }
      day.setDate(day.getDate() + 1);
    }

    totalWeeks++;
    if (daysInWeek < challenge.requiredDaysPerWeek) {
      missedWeeks++;
    }

    weekStart.setDate(weekStart.getDate() + 7);
  }

  // 일별 통계 (일당 벌금 모드용) - 제외 요일 스킵
  let totalDays = 0;
  let missedDays = 0;
  const dayIter = new Date(start);
  while (dayIter <= effectiveEnd) {
    const dayOfWeek = dayIter.getDay();
    if (!excludedDays.has(dayOfWeek)) {
      totalDays++;
      const dateStr = dayIter.toISOString().split('T')[0];
      if (!checkInDates.has(dateStr)) {
        missedDays++;
      }
    }
    dayIter.setDate(dayIter.getDate() + 1);
  }

  const totalFine =
    fineMode === 'daily'
      ? missedDays * challenge.finePerMiss
      : missedWeeks * challenge.finePerMiss;

  return {
    totalFine,
    missedWeeks,
    totalWeeks,
    missedDays,
    totalDays,
    fineMode,
  };
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
