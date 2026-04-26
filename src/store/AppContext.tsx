import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from 'react';
import { Challenge, CheckIn, User } from '../types';
import { challengeHasParticipant } from '../utils/challengeGuards';
import {
  subscribeChallenges,
  subscribeCheckIns,
  subscribeUsers,
  createChallenge as fbCreateChallenge,
  updateChallenge as fbUpdateChallenge,
  joinChallenge as fbJoinChallenge,
  addCheckIn as fbAddCheckIn,
  createUser as fbCreateUser,
  updateUserName as fbUpdateUserName,
  uploadCheckInImage,
  getUser as fbGetUser,
  deleteChallenge as fbDeleteChallenge,
  deleteCheckIn as fbDeleteCheckIn,
  findChallengeByInviteCode,
  updateUserProfile as fbUpdateUserProfile,
  uploadUserAvatar,
  toggleCheckInReaction as fbToggleCheckInReaction,
  updateParticipantColor as fbUpdateParticipantColor,
  updateUserPushProvisioning as fbUpdateUserPushProvisioning,
  setUserChallengePushMuted as fbSetUserChallengePushMuted,
} from '../firebase/firestore';
import { syncExpoPushTokenToProfile } from '../utils/registerPushNotifications';
import { auth } from '../firebase/config';
import { compressAvatarPhoto, compressCheckInPhoto } from '../utils/compressImage';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';

interface AppState {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  authError: string | null;
  users: User[];
  challenges: Challenge[];
  checkIns: CheckIn[];
}

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

const initialState: AppState = {
  currentUser: null,
  firebaseUser: null,
  authLoading: true,
  authError: null,
  users: [],
  challenges: [],
  checkIns: [],
};

type Action =
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_FIREBASE_USER'; payload: FirebaseUser | null }
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'SET_AUTH_ERROR'; payload: string | null }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_CHALLENGES'; payload: Challenge[] }
  | { type: 'SET_CHECKINS'; payload: CheckIn[] };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_AUTH_LOADING':
      return { ...state, authLoading: action.payload };
    case 'SET_FIREBASE_USER':
      return { ...state, firebaseUser: action.payload };
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_AUTH_ERROR':
      return { ...state, authError: action.payload };
    case 'SET_USERS': {
      const users = action.payload;
      const uid = state.currentUser?.id;
      if (uid) {
        const row = users.find((u) => u.id === uid);
        if (row) {
          return {
            ...state,
            users,
            currentUser: { ...state.currentUser, ...row },
          };
        }
      }
      return { ...state, users };
    }
    case 'SET_CHALLENGES':
      return { ...state, challenges: action.payload };
    case 'SET_CHECKINS':
      return { ...state, checkIns: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  actions: {
    signInWithEmailPassword: (email: string, password: string) => Promise<void>;
    signUpWithEmailPassword: (
      email: string,
      password: string,
      displayName: string
    ) => Promise<void>;
    signOut: () => Promise<void>;
    createChallenge: (challenge: Challenge) => Promise<void>;
    updateChallenge: (challenge: Challenge) => Promise<void>;
    joinChallenge: (challengeId: string) => Promise<void>;
    addCheckIn: (checkIn: CheckIn, localImageUri?: string) => Promise<void>;
    updateUserName: (name: string) => Promise<void>;
    updateUserEmail: (newEmail: string, currentPassword: string) => Promise<void>;
    requestPasswordResetEmail: (email: string) => Promise<void>;
    updateUserPhoto: (localImageUri: string) => Promise<void>;
    deleteChallenge: (challengeId: string) => Promise<void>;
    deleteCheckIn: (checkIn: CheckIn) => Promise<void>;
    joinByCode: (code: string) => Promise<{ success: boolean; message: string; challengeId?: string }>;
    toggleCheckInReaction: (checkInId: string, type: 'thumbsUp' | 'sad', hasReacted: boolean) => Promise<void>;
    updateParticipantColor: (challengeId: string, color: string) => Promise<void>;
    setChallengePushMuted: (challengeId: string, muted: boolean) => Promise<void>;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          dispatch({ type: 'SET_FIREBASE_USER', payload: firebaseUser });
          const email = firebaseUser.email ?? '';
          const existing = await fbGetUser(firebaseUser.uid);
          const nameFromAuth =
            firebaseUser.displayName ??
            (email ? email.split('@')[0] : '사용자');

          if (!existing) {
            const user: User = {
              id: firebaseUser.uid,
              email,
              name: nameFromAuth,
              avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
            };
            await fbCreateUser(user);
            dispatch({ type: 'SET_CURRENT_USER', payload: user });
          } else {
            // users 문서(프로필)를 이름의 기본 소스로 둡니다. Auth displayName이
            // updateProfile 없이 오래된 값으로 남으면, 아래를 반대로 쓰면
            // Firestore를 구 이름으로 덮어쓰는 버그가 납니다.
            const nameFromFirestore =
              typeof existing.name === 'string' && existing.name.trim() !== ''
                ? existing.name.trim()
                : null;
            const merged: User = {
              ...existing,
              email: email || existing.email,
              name:
                nameFromFirestore ??
                firebaseUser.displayName ??
                nameFromAuth,
            };
            if (
              merged.email !== existing.email ||
              merged.name !== existing.name
            ) {
              await fbUpdateUserProfile(firebaseUser.uid, {
                email: merged.email,
                name: merged.name,
              });
            }
            dispatch({ type: 'SET_CURRENT_USER', payload: merged });
          }
        } else {
          dispatch({ type: 'SET_FIREBASE_USER', payload: null });
          dispatch({ type: 'SET_CURRENT_USER', payload: null });
        }
      } catch (error) {
        console.error('Auth state sync error:', error);
        if (firebaseUser) {
          const fallbackUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            name:
              firebaseUser.displayName ??
              firebaseUser.email?.split('@')[0] ??
              '사용자',
            avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
          };
          dispatch({ type: 'SET_CURRENT_USER', payload: fallbackUser });
          dispatch({
            type: 'SET_AUTH_ERROR',
            payload: '서버 연결에 문제가 있어 일부 기능이 제한될 수 있습니다.',
          });
        }
      }
      dispatch({ type: 'SET_AUTH_LOADING', payload: false });
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const uid = state.currentUser?.id;
    if (!uid) return;
    void syncExpoPushTokenToProfile(uid, fbUpdateUserPushProvisioning).catch((e) => {
      console.warn('Expo push token sync:', e);
    });
  }, [state.currentUser?.id]);

  useEffect(() => {
    if (!state.firebaseUser) return;
    const unsubUsers = subscribeUsers((users) => {
      dispatch({ type: 'SET_USERS', payload: users });
    });
    const unsubChallenges = subscribeChallenges((challenges) => {
      dispatch({ type: 'SET_CHALLENGES', payload: challenges });
    });
    const unsubCheckIns = subscribeCheckIns((checkIns) => {
      dispatch({ type: 'SET_CHECKINS', payload: checkIns });
    });
    return () => {
      unsubUsers();
      unsubChallenges();
      unsubCheckIns();
    };
  }, [state.firebaseUser]);

  const actions = {
    signInWithEmailPassword: async (email: string, password: string) => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!state.currentUser && cred.user) {
        const fu = cred.user;
        const fallbackUser: User = {
          id: fu.uid,
          email: fu.email ?? '',
          name: fu.displayName ?? fu.email?.split('@')[0] ?? '사용자',
          avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
        };
        dispatch({ type: 'SET_FIREBASE_USER', payload: fu });
        dispatch({ type: 'SET_CURRENT_USER', payload: fallbackUser });
      }
    },
    signUpWithEmailPassword: async (
      email: string,
      password: string,
      displayName: string
    ) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
    },
    signOut: async () => {
      await fbSignOut(auth);
      dispatch({ type: 'SET_FIREBASE_USER', payload: null });
      dispatch({ type: 'SET_CURRENT_USER', payload: null });
    },
    createChallenge: async (challenge: Challenge) => {
      await fbCreateChallenge(challenge);
    },
    updateChallenge: async (challenge: Challenge) => {
      await fbUpdateChallenge(challenge);
    },
    joinChallenge: async (challengeId: string) => {
      if (!state.currentUser) return;
      await fbJoinChallenge(challengeId, state.currentUser.id);
    },
    addCheckIn: async (checkIn: CheckIn, localImageUri?: string) => {
      if (checkIn.type === 'photo' && localImageUri) {
        let uploadUri = localImageUri;
        try {
          uploadUri = await compressCheckInPhoto(localImageUri);
        } catch {
          /* 압축 실패 시(웹 등) 원본 업로드 */
        }
        const downloadUrl = await uploadCheckInImage(
          checkIn.challengeId,
          checkIn.userId,
          checkIn.date,
          uploadUri
        );
        checkIn = { ...checkIn, content: downloadUrl };
      }
      await fbAddCheckIn(checkIn);
    },
    updateUserName: async (name: string) => {
      const u = state.currentUser;
      const fu = auth.currentUser;
      if (!u || !fu) return;
      const next = name.trim();
      if (!next) return;
      await fbUpdateUserName(u.id, next);
      try {
        await updateProfile(fu, { displayName: next });
      } catch (e) {
        console.error('updateProfile displayName', e);
      }
      dispatch({
        type: 'SET_CURRENT_USER',
        payload: { ...u, name: next },
      });
    },
    updateUserEmail: async (newEmail: string, currentPassword: string) => {
      const u = state.currentUser;
      const fu = auth.currentUser;
      if (!u || !fu || !fu.email) return;
      const next = newEmail.trim().toLowerCase();
      if (!next) return;
      const cred = EmailAuthProvider.credential(fu.email, currentPassword);
      await reauthenticateWithCredential(fu, cred);
      await updateEmail(fu, next);
      await fbUpdateUserProfile(u.id, { email: next });
      dispatch({
        type: 'SET_CURRENT_USER',
        payload: { ...u, email: next },
      });
      dispatch({ type: 'SET_FIREBASE_USER', payload: auth.currentUser });
    },
    requestPasswordResetEmail: async (email: string) => {
      const e = email.trim();
      if (!e) return;
      await sendPasswordResetEmail(auth, e);
    },
    updateUserPhoto: async (localImageUri: string) => {
      const u = state.currentUser;
      const fu = auth.currentUser;
      if (!u || !fu) return;
      let uploadUri = localImageUri;
      try {
        uploadUri = await compressAvatarPhoto(localImageUri);
      } catch {
        /* 압축 실패 시 원본 */
      }
      const url = await uploadUserAvatar(u.id, uploadUri);
      await fbUpdateUserProfile(u.id, { photoURL: url });
      await updateProfile(fu, { photoURL: url });
      dispatch({
        type: 'SET_CURRENT_USER',
        payload: { ...u, photoURL: url },
      });
    },
    deleteChallenge: async (challengeId: string) => {
      await fbDeleteChallenge(challengeId);
    },
    deleteCheckIn: async (checkIn: CheckIn) => {
      const u = state.currentUser;
      if (!u || checkIn.userId !== u.id) return;
      await fbDeleteCheckIn(checkIn);
    },
    joinByCode: async (code: string): Promise<{ success: boolean; message: string; challengeId?: string }> => {
      if (!state.currentUser) return { success: false, message: '로그인이 필요합니다.' };
      const challenge = await findChallengeByInviteCode(code);
      if (!challenge) return { success: false, message: '존재하지 않는 초대 코드입니다.' };
      if (challengeHasParticipant(challenge, state.currentUser.id)) {
        return { success: false, message: '이미 참여 중인 챌린지입니다.' };
      }
      await fbJoinChallenge(challenge.id, state.currentUser.id);
      return { success: true, message: `"${challenge.title}" 챌린지에 참여했습니다!`, challengeId: challenge.id };
    },
    toggleCheckInReaction: async (checkInId: string, type: 'thumbsUp' | 'sad', hasReacted: boolean) => {
      if (!state.currentUser) return;
      await fbToggleCheckInReaction(checkInId, type, state.currentUser.id, hasReacted);
    },
    updateParticipantColor: async (challengeId: string, color: string) => {
      if (!state.currentUser) return;
      await fbUpdateParticipantColor(challengeId, state.currentUser.id, color);
    },
    setChallengePushMuted: async (challengeId: string, muted: boolean) => {
      if (!state.currentUser) return;
      await fbSetUserChallengePushMuted(state.currentUser.id, challengeId, muted);
    },
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
