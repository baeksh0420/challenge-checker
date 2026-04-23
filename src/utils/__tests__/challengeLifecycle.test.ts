import { isRecentEndedChallenge } from '../challengeLifecycle';
import { Challenge } from '../../types';

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: '1',
    title: 'Test',
    description: '',
    creatorId: 'u1',
    startDate: '2026-04-01',
    endDate: '2026-04-20',
    requiredDaysPerWeek: 3,
    fineMode: 'weekly',
    excludedDays: [],
    finePerMiss: 5000,
    inviteCode: 'ABC123',
    participants: ['u1'],
    createdAt: '',
    ...overrides,
  };
}

describe('isRecentEndedChallenge', () => {
  const challenge = makeChallenge({ endDate: '2026-04-20' });

  it('returns false if today is before end date', () => {
    const ref = new Date(2026, 3, 19); // Apr 19
    expect(isRecentEndedChallenge(challenge, ref)).toBe(false);
  });

  it('returns false on the last day (end date itself)', () => {
    const ref = new Date(2026, 3, 20); // Apr 20 = endDate
    expect(isRecentEndedChallenge(challenge, ref)).toBe(false);
  });

  it('returns true the day after end date', () => {
    const ref = new Date(2026, 3, 21); // Apr 21
    expect(isRecentEndedChallenge(challenge, ref)).toBe(true);
  });

  it('returns true 7 days after end date', () => {
    const ref = new Date(2026, 3, 27); // Apr 27 = endDate + 7
    expect(isRecentEndedChallenge(challenge, ref)).toBe(true);
  });

  it('returns false 8 days after end date', () => {
    const ref = new Date(2026, 3, 28); // Apr 28 = endDate + 8
    expect(isRecentEndedChallenge(challenge, ref)).toBe(false);
  });
});
