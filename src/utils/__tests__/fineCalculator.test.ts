import {
  formatLocalDate,
  getDatesBetween,
  startOfLocalMondayWeek,
  datesInMondayWeekWithinRange,
  getDaysInMonth,
  getFirstDayOfMonth,
  getWeeklyFineRule,
  countCheckInsOnDates,
} from '../fineCalculator';
import { Challenge, CheckIn } from '../../types';

describe('formatLocalDate', () => {
  it('formats a date as YYYY-MM-DD using local timezone', () => {
    const d = new Date(2026, 0, 5); // Jan 5 2026, local
    expect(formatLocalDate(d)).toBe('2026-01-05');
  });

  it('pads single-digit month and day', () => {
    const d = new Date(2025, 2, 9); // Mar 9 2025
    expect(formatLocalDate(d)).toBe('2025-03-09');
  });

  it('handles Dec 31', () => {
    const d = new Date(2025, 11, 31);
    expect(formatLocalDate(d)).toBe('2025-12-31');
  });
});

describe('getDatesBetween', () => {
  it('returns all dates between start and end inclusive', () => {
    const result = getDatesBetween('2026-04-01', '2026-04-03');
    expect(result).toEqual(['2026-04-01', '2026-04-02', '2026-04-03']);
  });

  it('returns single date when start equals end', () => {
    expect(getDatesBetween('2026-04-15', '2026-04-15')).toEqual(['2026-04-15']);
  });

  it('returns empty when start is after end', () => {
    expect(getDatesBetween('2026-04-05', '2026-04-03')).toEqual([]);
  });

  it('crosses month boundary correctly', () => {
    const result = getDatesBetween('2026-01-30', '2026-02-02');
    expect(result).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
  });
});

describe('startOfLocalMondayWeek', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date(2026, 3, 22); // Wed Apr 22 2026
    const mon = startOfLocalMondayWeek(wed);
    expect(formatLocalDate(mon)).toBe('2026-04-20');
    expect(mon.getDay()).toBe(1); // Monday
  });

  it('returns same day for a Monday', () => {
    const mon = new Date(2026, 3, 20); // Mon Apr 20 2026
    expect(formatLocalDate(startOfLocalMondayWeek(mon))).toBe('2026-04-20');
  });

  it('returns previous Monday for a Sunday', () => {
    const sun = new Date(2026, 3, 26); // Sun Apr 26 2026
    expect(formatLocalDate(startOfLocalMondayWeek(sun))).toBe('2026-04-20');
  });
});

describe('datesInMondayWeekWithinRange', () => {
  it('clips week to range boundaries', () => {
    // Range: Apr 22 (Wed) ~ Apr 24 (Fri), Week of Apr 20 (Mon) ~ Apr 26 (Sun)
    const wed = new Date(2026, 3, 22);
    const result = datesInMondayWeekWithinRange(wed, '2026-04-22', '2026-04-24');
    expect(result).toEqual(['2026-04-22', '2026-04-23', '2026-04-24']);
  });

  it('returns full week if range is wider', () => {
    const wed = new Date(2026, 3, 22);
    const result = datesInMondayWeekWithinRange(wed, '2026-04-01', '2026-04-30');
    expect(result).toHaveLength(7);
    expect(result[0]).toBe('2026-04-20');
    expect(result[6]).toBe('2026-04-26');
  });
});

describe('getDaysInMonth / getFirstDayOfMonth', () => {
  it('Feb 2024 is leap year (29 days)', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29);
  });

  it('Feb 2025 is not leap year (28 days)', () => {
    expect(getDaysInMonth(2025, 1)).toBe(28);
  });

  it('returns correct first day of month', () => {
    // Apr 1, 2026 is Wednesday (day 3)
    expect(getFirstDayOfMonth(2026, 3)).toBe(3);
  });
});

describe('getWeeklyFineRule', () => {
  const base: Challenge = {
    id: '1',
    title: 'Test',
    description: '',
    creatorId: 'u1',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    requiredDaysPerWeek: 3,
    fineMode: 'weekly',
    excludedDays: [],
    finePerMiss: 5000,
    inviteCode: 'ABC123',
    participants: ['u1'],
    createdAt: '',
  };

  it('returns flat by default for weekly mode', () => {
    expect(getWeeklyFineRule(base)).toBe('flat');
  });

  it('returns perShortfall when set', () => {
    expect(getWeeklyFineRule({ ...base, weeklyFineRule: 'perShortfall' })).toBe('perShortfall');
  });

  it('returns flat for daily mode regardless of weeklyFineRule', () => {
    expect(getWeeklyFineRule({ ...base, fineMode: 'daily', weeklyFineRule: 'perShortfall' })).toBe('flat');
  });
});

describe('countCheckInsOnDates', () => {
  const checkIns: CheckIn[] = [
    { id: '1', challengeId: 'c1', userId: 'u1', date: '2026-04-21', type: 'text', content: 'ok', createdAt: '' },
    { id: '2', challengeId: 'c1', userId: 'u1', date: '2026-04-22', type: 'text', content: 'ok', createdAt: '' },
    { id: '3', challengeId: 'c1', userId: 'u2', date: '2026-04-21', type: 'text', content: 'ok', createdAt: '' },
    { id: '4', challengeId: 'c2', userId: 'u1', date: '2026-04-21', type: 'text', content: 'ok', createdAt: '' },
  ];

  it('counts only matching challenge + user check-ins', () => {
    const count = countCheckInsOnDates('c1', 'u1', checkIns, ['2026-04-21', '2026-04-22', '2026-04-23']);
    expect(count).toBe(2);
  });

  it('returns 0 when no matches', () => {
    expect(countCheckInsOnDates('c1', 'u1', checkIns, ['2026-04-25'])).toBe(0);
  });
});
