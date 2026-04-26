import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { DateTime } from 'luxon';
import * as logger from 'firebase-functions/logger';

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

/**
 * 배포 리전 — **Firestore 데이터베이스 위치**와 맞춰야 배포·트리거가 안정적입니다.
 * Firebase 콘솔 → Firestore → 데이터베이스 → **위치** 확인 후 아래만 수정하세요.
 *
 * | Firestore 위치(예)     | 여기에 넣을 값        |
 * |------------------------|----------------------|
 * | nam5, us-central(멀티) | us-central1          |
 * | eur3, europe-west      | europe-west1       |
 * | asia-northeast3(서울)  | asia-northeast3      |
 * | asia-northeast1(도쿄)  | asia-northeast1      |
 *
 * @see https://firebase.google.com/docs/functions/locations
 */
const FUNCTIONS_REGION = 'asia-northeast3';

const USERS = 'users';
const CHALLENGES = 'challenges';
const CHECKINS = 'checkIns';
const PUSH_DEBOUNCE = 'pushDebounce';

const DEBOUNCE_MS = 8 * 60 * 1000;
/** 조용한 시간: 로컬 01:00 이상 ~ 09:00 미만 */
const QUIET_START_HOUR = 1;
const QUIET_END_HOUR = 9;
const DEFAULT_TZ = 'Asia/Seoul';

function subjectParticle(name: string): '이' | '가' {
  const t = name.trim();
  if (!t) return '가';
  const last = t.charAt(t.length - 1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return '가';
  const hasJong = (code - 0xac00) % 28 !== 0;
  return hasJong ? '이' : '가';
}

function buildBodyLine(authorName: string, lastType: string): string {
  const safeName = authorName.trim() || '참가자';
  const p = subjectParticle(safeName);
  const kind = lastType === 'photo' ? '사진을' : '글을';
  return `${safeName}${p} ${kind} 인증했어요`;
}

function isQuietHourForUser(timeZone: string | undefined, nowUtc: Date): boolean {
  const tz = timeZone && timeZone.length > 0 ? timeZone : DEFAULT_TZ;
  let hour: number;
  try {
    hour = DateTime.fromJSDate(nowUtc, { zone: 'utc' }).setZone(tz).hour;
  } catch {
    hour = DateTime.fromJSDate(nowUtc, { zone: 'utc' }).setZone(DEFAULT_TZ).hour;
  }
  return hour >= QUIET_START_HOUR && hour < QUIET_END_HOUR;
}

async function sendExpoPush(token: string, title: string, body: string): Promise<void> {
  if (!Expo.isExpoPushToken(token)) {
    logger.warn('Invalid Expo push token', String(token).substring(0, 24));
    return;
  }
  const msg: ExpoPushMessage = {
    to: token,
    sound: 'default',
    title,
    body,
    priority: 'high',
  };
  const [ticket] = await expo.sendPushNotificationsAsync([msg]);
  if (ticket.status === 'error') {
    logger.warn('Expo push error', ticket.message, ticket.details);
  }
}

/** checkIns 생성 시 디바운스 큐에 적재 */
export const onCheckInCreated = onDocumentCreated(
  {
    document: `${CHECKINS}/{checkInId}`,
    region: FUNCTIONS_REGION,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as Record<string, unknown>;
    if (data.skipParticipantPush === true) return;

    const challengeId = String(data.challengeId ?? '');
    const authorId = String(data.userId ?? '');
    const lastType = String(data.type ?? 'text');
    if (!challengeId || !authorId) return;

    const chSnap = await db.collection(CHALLENGES).doc(challengeId).get();
    if (!chSnap.exists) return;
    const ch = chSnap.data() as Record<string, unknown>;
    const challengeTitle =
      typeof ch.title === 'string' && ch.title.trim() ? ch.title.trim() : '챌린지';
    const participants = Array.isArray(ch.participants)
      ? (ch.participants as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    const others = participants.filter((id) => id !== authorId);
    if (others.length === 0) return;

    const uSnap = await db.collection(USERS).doc(authorId).get();
    const uData = uSnap.data() as Record<string, unknown> | undefined;
    const authorName =
      typeof uData?.name === 'string' && uData.name.trim() ? uData.name.trim() : '참가자';

    const flushAt = Timestamp.fromMillis(Date.now() + DEBOUNCE_MS);
    const debounceId = `${challengeId}_${authorId}`.replace(/\//g, '_');
    await db.collection(PUSH_DEBOUNCE).doc(debounceId).set(
      {
        flushAt,
        challengeId,
        authorId,
        authorName,
        challengeTitle,
        lastType: lastType === 'photo' ? 'photo' : 'text',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
);

async function appendDigestLine(userId: string, line: string): Promise<void> {
  const ref = db.collection(USERS).doc(userId);
  await ref.set(
    {
      pushDigestLines: FieldValue.arrayUnion(line),
      hasPushDigest: true,
    },
    { merge: true }
  );
}

/** 디바운스 만료분 처리: 즉시 푸시 또는 조용한 시간이면 요약 큐 */
export const flushPushDebouncesScheduled = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: FUNCTIONS_REGION,
    timeZone: 'UTC',
  },
  async () => {
    const now = Timestamp.now();
    const q = await db.collection(PUSH_DEBOUNCE).where('flushAt', '<=', now).limit(80).get();
    if (q.empty) return;

    const nowDate = new Date();

    for (const docSnap of q.docs) {
      const d = docSnap.data() as Record<string, unknown>;
      const challengeId = String(d.challengeId ?? '');
      const authorId = String(d.authorId ?? '');
      const authorName = String(d.authorName ?? '참가자');
      const challengeTitle = String(d.challengeTitle ?? '챌린지');
      const lastType = String(d.lastType ?? 'text');

      try {
        const chSnap = await db.collection(CHALLENGES).doc(challengeId).get();
        if (!chSnap.exists) {
          await docSnap.ref.delete();
          continue;
        }
        const ch = chSnap.data() as Record<string, unknown>;
        const participants = Array.isArray(ch.participants)
          ? (ch.participants as unknown[]).filter((x): x is string => typeof x === 'string')
          : [];
        const bodyLine = buildBodyLine(authorName, lastType);

        for (const recipientId of participants) {
          if (recipientId === authorId) continue;

          const userSnap = await db.collection(USERS).doc(recipientId).get();
          if (!userSnap.exists) continue;
          const u = userSnap.data() as Record<string, unknown>;
          const muted = Array.isArray(u.pushMutedChallengeIds)
            ? (u.pushMutedChallengeIds as unknown[]).includes(challengeId)
            : false;
          if (muted) continue;

          const token =
            typeof u.expoPushToken === 'string' && u.expoPushToken.length > 0
              ? u.expoPushToken
              : null;
          if (!token) continue;

          const tz = typeof u.pushTimeZone === 'string' ? u.pushTimeZone : undefined;
          if (isQuietHourForUser(tz, nowDate)) {
            const digestLine = `'${challengeTitle}' — ${bodyLine}`;
            await appendDigestLine(recipientId, digestLine);
          } else {
            await sendExpoPush(token, challengeTitle, bodyLine);
          }
        }
      } catch (e) {
        logger.error('flushPushDebounce doc error', docSnap.id, e);
      } finally {
        await docSnap.ref.delete().catch(() => undefined);
      }
    }
  }
);

/** 조용한 시간에 쌓인 요약: 사용자 로컬 9시 이후에 한 번에 발송 */
export const sendMorningDigestScheduled = onSchedule(
  {
    schedule: 'every 10 minutes',
    region: FUNCTIONS_REGION,
    timeZone: 'UTC',
  },
  async () => {
    const q = await db.collection(USERS).where('hasPushDigest', '==', true).limit(100).get();
    if (q.empty) return;

    const nowUtc = new Date();

    for (const docSnap of q.docs) {
      const u = docSnap.data() as Record<string, unknown>;
      const lines = Array.isArray(u.pushDigestLines)
        ? (u.pushDigestLines as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      if (lines.length === 0) {
        await docSnap.ref.set({ hasPushDigest: false }, { merge: true });
        continue;
      }

      const token =
        typeof u.expoPushToken === 'string' && u.expoPushToken.length > 0
          ? u.expoPushToken
          : null;
      if (!token) {
        await docSnap.ref.set(
          { pushDigestLines: [], hasPushDigest: false },
          { merge: true }
        );
        continue;
      }

      const tz = typeof u.pushTimeZone === 'string' ? u.pushTimeZone : DEFAULT_TZ;
      let hour = 12;
      try {
        hour = DateTime.fromJSDate(nowUtc, { zone: 'utc' }).setZone(tz).hour;
      } catch {
        hour = DateTime.fromJSDate(nowUtc, { zone: 'utc' }).setZone(DEFAULT_TZ).hour;
      }
      if (hour < QUIET_END_HOUR) continue;

      const max = 12;
      const shown = lines.slice(0, max);
      const rest = lines.length - shown.length;
      const body =
        shown.join('\n') +
        (rest > 0 ? `\n…외 ${rest}건` : '');

      try {
        await sendExpoPush(token, '인증 알림 요약', body);
      } catch (e) {
        logger.error('digest push failed', docSnap.id, e);
        continue;
      }

      await docSnap.ref.set(
        { pushDigestLines: [], hasPushDigest: false },
        { merge: true }
      );
    }
  }
);
