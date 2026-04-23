import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Unsubscribe,
  setDoc,
  deleteDoc,
  deleteField,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './config';
import { Challenge, CheckIn, User } from '../types';

// ─── Collections ───
const USERS = 'users';
const CHALLENGES = 'challenges';
const CHECKINS = 'checkIns';

// ─── Users ───
function normalizeUserDoc(data: Record<string, unknown>, id: string): User {
  const photoURL =
    typeof data.photoURL === 'string' && data.photoURL.length > 0
      ? data.photoURL
      : undefined;
  return {
    id,
    email: typeof data.email === 'string' ? data.email : '',
    name: typeof data.name === 'string' ? data.name : '사용자',
    avatarColor: typeof data.avatarColor === 'string' ? data.avatarColor : '#6B7280',
    ...(photoURL ? { photoURL } : {}),
  };
}

export async function createUser(user: User): Promise<void> {
  await setDoc(doc(db, USERS, user.id), user);
}

export async function getUser(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, USERS, userId));
  if (!snap.exists()) return null;
  return normalizeUserDoc(snap.data() as Record<string, unknown>, snap.id);
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  await updateDoc(doc(db, USERS, userId), { name });
}

export async function updateUserProfile(
  userId: string,
  fields: { email?: string; name?: string; photoURL?: string | null }
): Promise<void> {
  await updateDoc(doc(db, USERS, userId), fields);
}

function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error('Failed to read local file'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export async function uploadUserAvatar(userId: string, uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  const imageRef = ref(storage, `avatars/${userId}.jpg`);
  await uploadBytes(imageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(imageRef);
}

export function subscribeUsers(callback: (users: User[]) => void): Unsubscribe {
  return onSnapshot(collection(db, USERS), (snapshot) => {
    const users = snapshot.docs.map((d) =>
      normalizeUserDoc(d.data() as Record<string, unknown>, d.id)
    );
    callback(users);
  });
}

// ─── Challenges ───
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createChallenge(challenge: Challenge): Promise<string> {
  const docRef = doc(db, CHALLENGES, challenge.id);
  await setDoc(docRef, {
    ...challenge,
    inviteCode: challenge.inviteCode || generateInviteCode(),
    createdAt: serverTimestamp(),
  });
  return challenge.id;
}

export async function updateChallenge(challenge: Challenge): Promise<void> {
  const ref = doc(db, CHALLENGES, challenge.id);
  await updateDoc(ref, {
    title: challenge.title,
    description: challenge.description,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    requiredDaysPerWeek: challenge.requiredDaysPerWeek,
    fineMode: challenge.fineMode,
    excludedDays: challenge.excludedDays,
    finePerMiss: challenge.finePerMiss,
    weeklyFineRule:
      challenge.fineMode === 'weekly'
        ? (challenge.weeklyFineRule ?? 'flat')
        : deleteField(),
  });
}

export async function joinChallenge(challengeId: string, userId: string): Promise<void> {
  const ref = doc(db, CHALLENGES, challengeId);
  await updateDoc(ref, {
    participants: arrayUnion(userId),
  });
}

export async function findChallengeByInviteCode(code: string): Promise<Challenge | null> {
  const q = query(collection(db, CHALLENGES), where('inviteCode', '==', code.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    ...data,
    id: d.id,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? '',
  } as Challenge;
}

export function subscribeChallenges(
  callback: (challenges: Challenge[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, CHALLENGES), (snapshot) => {
    const challenges = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? '',
      } as Challenge;
    });
    callback(challenges);
  });
}

// ─── Check-Ins ───
export async function addCheckIn(checkIn: CheckIn): Promise<void> {
  // 같은 날 같은 유저 같은 챌린지의 기존 체크인 삭제 (교체)
  const q = query(
    collection(db, CHECKINS),
    where('challengeId', '==', checkIn.challengeId),
    where('userId', '==', checkIn.userId),
    where('date', '==', checkIn.date)
  );
  const existing = await getDocs(q);
  for (const d of existing.docs) {
    await deleteDoc(d.ref);
  }

  await setDoc(doc(db, CHECKINS, checkIn.id), {
    ...checkIn,
    createdAt: serverTimestamp(),
  });
}

export async function deleteCheckIn(
  checkIn: Pick<CheckIn, 'id' | 'challengeId' | 'userId' | 'date' | 'type'>
): Promise<void> {
  if (checkIn.type === 'photo') {
    try {
      const imageRef = ref(
        storage,
        `checkIns/${checkIn.challengeId}/${checkIn.userId}/${checkIn.date}.jpg`
      );
      await deleteObject(imageRef);
    } catch {
      /* 파일 없음 등 무시 */
    }
  }
  await deleteDoc(doc(db, CHECKINS, checkIn.id));
}

export function subscribeCheckIns(
  callback: (checkIns: CheckIn[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, CHECKINS), (snapshot) => {
    const checkIns = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? '',
      } as CheckIn;
    });
    callback(checkIns);
  });
}

export function subscribeCheckInsByChallenge(
  challengeId: string,
  callback: (checkIns: CheckIn[]) => void
): Unsubscribe {
  const q = query(
    collection(db, CHECKINS),
    where('challengeId', '==', challengeId)
  );
  return onSnapshot(q, (snapshot) => {
    const checkIns = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? '',
      } as CheckIn;
    });
    callback(checkIns);
  });
}

export async function toggleCheckInReaction(
  checkInId: string,
  reactionType: 'thumbsUp' | 'sad',
  userId: string,
  hasReacted: boolean
): Promise<void> {
  const checkInRef = doc(db, CHECKINS, checkInId);
  await updateDoc(checkInRef, {
    [`reactions.${reactionType}`]: hasReacted ? arrayRemove(userId) : arrayUnion(userId),
  });
}

export async function updateParticipantColor(
  challengeId: string,
  userId: string,
  color: string
): Promise<void> {
  const challengeRef = doc(db, CHALLENGES, challengeId);
  await updateDoc(challengeRef, {
    [`participantColors.${userId}`]: color,
  });
}

// ─── Storage (사진 업로드) ───
export async function deleteChallenge(challengeId: string): Promise<void> {
  // 챌린지 문서 삭제
  await deleteDoc(doc(db, CHALLENGES, challengeId));
  // 관련 체크인 삭제
  const q = query(collection(db, CHECKINS), where('challengeId', '==', challengeId));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
}

export async function uploadCheckInImage(
  challengeId: string,
  userId: string,
  date: string,
  uri: string
): Promise<string> {
  const blob = await uriToBlob(uri);
  const imageRef = ref(storage, `checkIns/${challengeId}/${userId}/${date}.jpg`);
  await uploadBytes(imageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(imageRef);
}
