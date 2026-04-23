import { participantIds, challengeHasParticipant } from '../challengeGuards';

describe('participantIds', () => {
  it('returns the array when participants is a string array', () => {
    expect(participantIds({ participants: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  it('returns empty array when participants is undefined', () => {
    expect(participantIds({})).toEqual([]);
  });

  it('returns empty array when participants is not an array', () => {
    expect(participantIds({ participants: 'broken' })).toEqual([]);
    expect(participantIds({ participants: null })).toEqual([]);
    expect(participantIds({ participants: 123 })).toEqual([]);
  });
});

describe('challengeHasParticipant', () => {
  const challenge = { participants: ['user1', 'user2', 'user3'] };

  it('returns true when user is a participant', () => {
    expect(challengeHasParticipant(challenge, 'user2')).toBe(true);
  });

  it('returns false when user is not a participant', () => {
    expect(challengeHasParticipant(challenge, 'user99')).toBe(false);
  });

  it('returns false when userId is null', () => {
    expect(challengeHasParticipant(challenge, null)).toBe(false);
  });

  it('returns false when userId is undefined', () => {
    expect(challengeHasParticipant(challenge, undefined)).toBe(false);
  });

  it('returns false when participants is missing', () => {
    expect(challengeHasParticipant({}, 'user1')).toBe(false);
  });
});
