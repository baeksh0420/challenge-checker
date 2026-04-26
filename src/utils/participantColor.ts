import { Challenge, User } from '../types';

/** 캘린더·탭 등에서 참여자별 색 = 프로필(avatarColor)과 동일 */
export function getParticipantAccent(users: User[], userId: string): string {
  const u = users.find((x) => x.id === userId);
  return u?.avatarColor ?? '#4F46E5';
}

/** 챌린지별 커스텀 컬러 우선, 없으면 avatarColor */
export function getChallengeParticipantAccent(
  challenge: Challenge,
  users: User[],
  userId: string
): string {
  const custom = challenge.participantColors?.[userId];
  if (custom) return custom;
  return getParticipantAccent(users, userId);
}
