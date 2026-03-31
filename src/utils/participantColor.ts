import { User } from '../types';

/** 캘린더·탭 등에서 참여자별 색 = 프로필(avatarColor)과 동일 */
export function getParticipantAccent(users: User[], userId: string): string {
  const u = users.find((x) => x.id === userId);
  return u?.avatarColor ?? '#4F46E5';
}
