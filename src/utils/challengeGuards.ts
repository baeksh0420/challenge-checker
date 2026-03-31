/** Firestore 등에서 participants가 빠진 문서에 대비 */
export function participantIds(challenge: { participants?: unknown }): string[] {
  const p = challenge.participants;
  return Array.isArray(p) ? p : [];
}

export function challengeHasParticipant(
  challenge: { participants?: unknown },
  userId: string | null | undefined
): boolean {
  if (userId == null) return false;
  return participantIds(challenge).includes(userId);
}
