# 챌린지 체커 (Challenge Checker)

다수의 사용자가 공동 목표를 가지고 챌린지를 진행하도록 도와주는 앱입니다.

## 기술 스택

- **React Native** + **Expo** (iOS / Android 크로스 플랫폼)
- **TypeScript**
- **React Navigation** (네비게이션)
- **Context API + useReducer** (상태 관리)
- **expo-image-picker** (사진 인증)

## 프로젝트 구조

```
src/
├── components/          # 공통 컴포넌트
│   ├── CalendarView.tsx     # 진행 여부 캘린더
│   ├── ChallengeCard.tsx    # 챌린지 카드
│   └── ParticipantProgress.tsx  # 참여자 현황 & 벌금
├── navigation/
│   └── AppNavigator.tsx     # 네비게이션 설정
├── screens/             # 화면
│   ├── HomeScreen.tsx           # 홈 (챌린지 목록)
│   ├── CreateChallengeScreen.tsx # 챌린지 생성
│   ├── ChallengeDetailScreen.tsx # 챌린지 상세 (캘린더, 참여자)
│   ├── CheckInScreen.tsx        # 일일 인증 (사진/글)
│   ├── MyChallengesScreen.tsx   # 내 챌린지
│   └── ProfileScreen.tsx       # 프로필 & 통계
├── store/
│   └── AppContext.tsx       # 전역 상태 관리
├── types/
│   └── index.ts             # 타입 정의
└── utils/
    └── fineCalculator.ts    # 벌금 산정 로직
```

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npx expo start
```

Expo Go 앱을 사용하여 QR 코드를 스캔하면 실기기에서 바로 테스트할 수 있습니다.

## 주요 기능

1. **챌린지 생성** — 이름, 설명, 기간, 주당 필수 횟수, 벌금 설정
2. **챌린지 참여** — 다른 사용자의 챌린지에 참여
3. **일일 인증** — 사진 촬영/앨범 선택 또는 글 작성으로 인증
4. **캘린더 뷰** — 참여자별 진행 여부를 캘린더에서 확인
5. **벌금 자동 계산** — 주별 미달성 시 벌금 자동 산정
6. **참여자 현황** — 전체 참여자의 진행률과 벌금 확인
