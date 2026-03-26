import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { Challenge, CheckIn, User } from '../types';
import {
  subscribeChallenges,
  subscribeCheckIns,
  subscribeUsers,
  createChallenge as fbCreateChallenge,
  joinChallenge as fbJoinChallenge,
  addCheckIn as fbAddCheckIn,
  createUser as fbCreateUser,
  updateUserName as fbUpdateUserName,
  uploadCheckInImage,
  getUser as fbGetUser,
  deleteChallenge as fbDeleteChallenge,
  findChallengeByInviteCode,
} from '../firebase/firestore';
import { auth } from '../firebase/config';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  signOut as fbSignOut,
  GoogleAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';

// ─── State ───
interface AppState {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  users: User[];
  challenges: Challenge[];
  checkIns: CheckIn[];
}

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

const initialState: AppState = {
  currentUser: null,
  firebaseUser: null,
  authLoading: true,
  users: [],
  challenges: [],
  checkIns: [],
};

// ─── Actions ───
type Action =
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_FIREBASE_USER'; payload: FirebaseUser | null }
  | { type: 'SET_CURRENT_USER'; payload: User }
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
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_CHALLENGES':
      return { ...state, challenges: action.payload };
    case 'SET_CHECKINS':
      return { ...state, checkIns: action.payload };
    default:
      return state;
  }
}

// ─── Context ───
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  actions: {
    signInWithGoogle: () => Promise<void>;
    signInWithGoogleIdToken: (idToken: string) => Promise<void>;
    signOut: () => Promise<void>;
    createChallenge: (challenge: Challenge) => Promise<void>;
    joinChallenge: (challengeId: string) => Promise<void>;
    addCheckIn: (checkIn: CheckIn, localImageUri?: string) => Promise<void>;
    updateUserName: (name: string) => Promise<void>;
    deleteChallenge: (challengeId: string) => Promise<void>;
    joinByCode: (code: string) => Promise<{ success: boolean; message: string }>;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // ─── Firebase Auth (Google 로그인) ───
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          dispatch({ type: 'SET_FIREBASE_USER', payload: firebaseUser });
          let user = await fbGetUser(firebaseUser.uid);
          if (!user) {
            const colorIndex = Math.floor(Math.random() * COLORS.length);
            user = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName ?? '사용자',
              avatarColor: COLORS[colorIndex],
            };
            await fbCreateUser(user);
          }
          dispatch({ type: 'SET_CURRENT_USER', payload: user });
        } else {
          dispatch({ type: 'SET_FIREBASE_USER', payload: null });
        }
      } catch (error) {
        console.error('Auth error:', error);
      }
      dispatch({ type: 'SET_AUTH_LOADING', payload: false });
    });
    return () => unsubAuth();
  }, []);

  // ─── Firestore 실시간 구독 ───
  useEffect(() => {
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
  }, []);

  // ─── Actions ───
  const actions = {
    signInWithGoogle: async () => {
      if (Platform.OS !== 'web') {
        throw new Error('Native sign-in uses OAuth flow from LoginScreen.');
      }
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    },
    signInWithGoogleIdToken: async (idToken: string) => {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    },
    signOut: async () => {
      await fbSignOut(auth);
      dispatch({ type: 'SET_FIREBASE_USER', payload: null });
    },
    createChallenge: async (challenge: Challenge) => {
      await fbCreateChallenge(challenge);
    },
    joinChallenge: async (challengeId: string) => {
      if (!state.currentUser) return;
      await fbJoinChallenge(challengeId, state.currentUser.id);
    },
    addCheckIn: async (checkIn: CheckIn, localImageUri?: string) => {
      if (checkIn.type === 'photo' && localImageUri) {
        const downloadUrl = await uploadCheckInImage(
          checkIn.challengeId,
          checkIn.userId,
          checkIn.date,
          localImageUri
        );
        checkIn = { ...checkIn, content: downloadUrl };
      }
      await fbAddCheckIn(checkIn);
    },
    updateUserName: async (name: string) => {
      if (!state.currentUser) return;
      await fbUpdateUserName(state.currentUser.id, name);
      dispatch({
        type: 'SET_CURRENT_USER',
        payload: { ...state.currentUser, name },
      });
    },
    deleteChallenge: async (challengeId: string) => {
      await fbDeleteChallenge(challengeId);
    },
    joinByCode: async (code: string): Promise<{ success: boolean; message: string }> => {
      if (!state.currentUser) return { success: false, message: '로그인이 필요합니다.' };
      const challenge = await findChallengeByInviteCode(code);
      if (!challenge) return { success: false, message: '존재하지 않는 초대 코드입니다.' };
      if (challenge.participants.includes(state.currentUser.id)) {
        return { success: false, message: '이미 참여 중인 챌린지입니다.' };
      }
      await fbJoinChallenge(challenge.id, state.currentUser.id);
      return { success: true, message: `"${challenge.title}" 챌린지에 참여했습니다!` };
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
