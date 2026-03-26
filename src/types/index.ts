export interface User {
  id: string;
  name: string;
  avatarColor: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  requiredDaysPerWeek: number; // 주당 필수 수행 횟수
  fineMode: 'weekly' | 'daily'; // 벌금 모드: 주당 or 일당
  excludedDays: number[]; // 제외 요일 (0=일, 1=월, ..., 6=토) - 일당 모드용
  finePerMiss: number; // 미달성 시 벌금 (원)
  inviteCode: string; // 초대 코드 (6자리)
  participants: string[]; // user IDs
  createdAt: string;
}

export interface CheckIn {
  id: string;
  challengeId: string;
  userId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  type: 'photo' | 'text';
  content: string; // 텍스트 내용 또는 이미지 URI
  createdAt: string;
}

export type RootStackParamList = {
  MainTabs: undefined;
  CreateChallenge: undefined;
  ChallengeDetail: { challengeId: string };
  CheckIn: { challengeId: string };
  JoinByCode: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  MyChallenges: undefined;
  Profile: undefined;
};
