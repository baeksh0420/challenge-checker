import type { NavigatorScreenParams } from '@react-navigation/native';

export interface User {
  id: string;
  /** 로그인 아이디(이메일). Firebase Auth와 동일하게 둡니다. */
  email: string;
  name: string;
  avatarColor: string;
  /** 프로필 사진(Firebase Storage URL) */
  photoURL?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  requiredDaysPerWeek: number; // 주당 필수 수행 횟수
  /** weekly: 주간은 월~일(로컬) 기준 */
  fineMode: 'weekly' | 'daily';
  /**
   * 주당 벌금만 해당. 일당 모드에서는 저장하지 않음.
   * - flat: 마감된 주에 목표 미달이면 그 주당 벌금 1회(기존)
   * - perShortfall: 각 마감 주마다 (필수 횟수 − 실제 인증 일수)만큼 벌금 단위 누적
   */
  weeklyFineRule?: 'flat' | 'perShortfall';
  excludedDays: number[]; // 제외 요일 (0=일, 1=월, ..., 6=토) - 일당 모드용
  finePerMiss: number; // 미달성 시 벌금 (원)
  inviteCode: string; // 초대 코드 (6자리)
  participants: string[]; // user IDs
  /** 참여자별 캘린더 컬러 { userId: hexColor } */
  participantColors?: { [userId: string]: string };
  createdAt: string;
}

export interface CheckIn {
  id: string;
  challengeId: string;
  userId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  type: 'photo' | 'text';
  content: string; // 텍스트 내용 또는 이미지 URI
  /** 사진 인증(type: photo)에 함께 남기는 글(선택) */
  textNote?: string;
  createdAt: string;
  /** 이모지 반응 { userId[] } */
  reactions?: {
    thumbsUp: string[];
    sad: string[];
  };
}

export type MainTabParamList = {
  Home: undefined;
  Board: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  /** 수정 시 `editChallengeId` 전달 */
  CreateChallenge: { editChallengeId?: string } | undefined;
  ChallengeDetail: { challengeId: string };
  ChallengeBoard: { challengeId: string };
  /** `date` 미지정 시 오늘(로컬) */
  CheckIn: { challengeId: string; date?: string };
  JoinByCode: undefined;
  /** 참여한 모든 챌린지(진행·예정·종료) */
  AllMyChallenges: undefined;
  /** 내 인증 전체 기록 */
  MyCheckInHistory: undefined;
};
