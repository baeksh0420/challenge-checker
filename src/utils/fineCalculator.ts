import { Challenge, CheckIn } from '../types';

export interface FineResult {
  totalFine: number;
  missedWeeks: number;
  totalWeeks: number;
  missedDays: number;
  totalDays: number;
  fineMode: 'weekly' | 'daily';
  /** 주당 모드: 마감된 주들의 (필수−인증 일수) 합. 일당 모드에서는 0 */
  weeklyShortfallTotal: number;
}

export function getWeeklyFineRule(challenge: Challenge): 'flat' | 'perShortfall' {
  if ((challenge.fineMode ?? 'weekly') !== 'weekly') return 'flat';
  return challenge.weeklyFineRule ?? 'flat';
}

/** 로컬(기기) 기준 YYYY-MM-DD — 인증일·오늘·주(월~일) 계산에 통일 */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDate(date: Date): string {
  return formatLocalDate(date);
}

/** 해당 날짜가 속한 주의 월요일(로컬 자정 기준) */
export function startOfLocalMondayWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + delta);
  return x;
}

export function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  while (current <= endDate) {
    dates.push(formatLocalDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** dayInWeek가 속한 월~일 주와 [rangeStart, rangeEnd]의 교집합 날짜들 */
export function datesInMondayWeekWithinRange(
  dayInWeek: Date,
  rangeStart: string,
  rangeEnd: string
): string[] {
  const mon = startOfLocalMondayWeek(dayInWeek);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const ws = formatLocalDate(mon);
  const we = formatLocalDate(sun);
  const lo = ws > rangeStart ? ws : rangeStart;
  const hi = we < rangeEnd ? we : rangeEnd;
  if (lo > hi) return [];
  return getDatesBetween(lo, hi);
}

export function countCheckInsOnDates(
  challengeId: string,
  userId: string,
  checkIns: CheckIn[],
  dates: string[]
): number {
  const set = new Set(
    checkIns
      .filter((c) => c.challengeId === challengeId && c.userId === userId)
      .map((c) => c.date)
  );
  let n = 0;
  for (const d of dates) {
    if (set.has(d)) n++;
  }
  return n;
}

export function getWeeklyProgressThisMondayWeek(
  challenge: Challenge,
  userId: string,
  checkIns: CheckIn[],
  refDay: Date
): { current: number; required: number } {
  const required = challenge.requiredDaysPerWeek;
  const dates = datesInMondayWeekWithinRange(refDay, challenge.startDate, challenge.endDate);
  const current = countCheckInsOnDates(challenge.id, userId, checkIns, dates);
  return { current, required };
}

/** 내 챌린지 탭: 일당 — 오늘(로컬) 인증 필요 */
export function needsDailyReminder(
  challenge: Challenge,
  userId: string,
  checkIns: CheckIn[],
  todayStr: string
): boolean {
  if ((challenge.fineMode ?? 'weekly') !== 'daily') return false;
  const now = new Date(`${todayStr}T12:00:00`);
  if (now < new Date(`${challenge.startDate}T12:00:00`)) return false;
  if (now > new Date(`${challenge.endDate}T12:00:00`)) return false;
  const excluded = new Set(challenge.excludedDays ?? []);
  const dow = new Date(`${todayStr}T12:00:00`).getDay();
  if (excluded.has(dow)) return false;
  const done = checkIns.some(
    (c) => c.challengeId === challenge.id && c.userId === userId && c.date === todayStr
  );
  return !done;
}

/** 내 챌린지 탭: 주당 — 이번 주(월~일) 목표 미달성 */
export function needsWeeklyReminder(
  challenge: Challenge,
  userId: string,
  checkIns: CheckIn[],
  refDay: Date
): boolean {
  if ((challenge.fineMode ?? 'weekly') !== 'weekly') return false;
  const now = new Date(formatLocalDate(refDay) + 'T12:00:00');
  if (now < new Date(`${challenge.startDate}T12:00:00`)) return false;
  if (now > new Date(`${challenge.endDate}T12:00:00`)) return false;
  const { current, required } = getWeeklyProgressThisMondayWeek(challenge, userId, checkIns, refDay);
  return current < required;
}

export function calculateFine(
  challenge: Challenge,
  userId: string,
  checkIns: CheckIn[]
): FineResult {
  const startD = new Date(`${challenge.startDate}T12:00:00`);
  const endD = new Date(`${challenge.endDate}T12:00:00`);
  const now = new Date();
  const effectiveEndD = now < endD ? now : endD;
  const fineMode = challenge.fineMode ?? 'weekly';
  /** 해당 인증일(의 날)이 끝난 뒤(다음날 0시 이후)부터만 미인증·미달로 벌금 집계 */
  const todayStr = formatLocalDate(now);

  const userCheckIns = checkIns.filter(
    (c) => c.challengeId === challenge.id && c.userId === userId
  );
  const checkInDates = new Set(userCheckIns.map((c) => c.date));
  const excludedDays = new Set(challenge.excludedDays ?? []);

  const startStr = formatLocalDate(startD);
  const effStr = formatLocalDate(effectiveEndD);

  let totalWeeks = 0;
  let missedWeeks = 0;
  let weeklyShortfallTotal = 0;
  let weekMon = startOfLocalMondayWeek(startD);
  const requiredDays = challenge.requiredDaysPerWeek;

  while (true) {
    const ws = formatLocalDate(weekMon);
    if (ws > effStr) break;
    const sun = new Date(weekMon);
    sun.setDate(sun.getDate() + 6);
    const we = formatLocalDate(sun);
    const segStart = ws > startStr ? ws : startStr;
    const segEnd = we < effStr ? we : effStr;
    if (segStart <= segEnd) {
      let daysInWeek = 0;
      for (const ds of getDatesBetween(segStart, segEnd)) {
        if (checkInDates.has(ds)) daysInWeek++;
      }
      if (segEnd < todayStr) {
        totalWeeks++;
        if (daysInWeek < requiredDays) {
          missedWeeks++;
          weeklyShortfallTotal += requiredDays - daysInWeek;
        }
      }
    }
    weekMon.setDate(weekMon.getDate() + 7);
  }

  let totalDays = 0;
  let missedDays = 0;
  const dayIter = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
  const lastDay = new Date(
    effectiveEndD.getFullYear(),
    effectiveEndD.getMonth(),
    effectiveEndD.getDate()
  );
  while (dayIter <= lastDay) {
    const dayOfWeek = dayIter.getDay();
    if (!excludedDays.has(dayOfWeek)) {
      const dateStr = formatLocalDate(dayIter);
      if (dateStr < todayStr) {
        totalDays++;
        if (!checkInDates.has(dateStr)) missedDays++;
      }
    }
    dayIter.setDate(dayIter.getDate() + 1);
  }

  const weeklyRule = getWeeklyFineRule(challenge);
  const totalFine =
    fineMode === 'daily'
      ? missedDays * challenge.finePerMiss
      : weeklyRule === 'perShortfall'
        ? weeklyShortfallTotal * challenge.finePerMiss
        : missedWeeks * challenge.finePerMiss;

  return {
    totalFine,
    missedWeeks,
    totalWeeks,
    missedDays,
    totalDays,
    fineMode,
    weeklyShortfallTotal: fineMode === 'weekly' ? weeklyShortfallTotal : 0,
  };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
