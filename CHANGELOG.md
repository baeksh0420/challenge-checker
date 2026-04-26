# Changelog

이 프로젝트의 주요 변경 사항을 기록합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며, 버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

## [1.2.1] - 2026-04-26

### Fixed

- Android: 다른 사용자 **프로필** 화면에서 스택 헤더와 겹치던 **상단 여백** 제거(`UserProfileScreen`).
- iOS: 챌린지 **캘린더 컬러** 선택 시 링이 잘리거나 검은 원이 비정상적으로 보이던 현상 수정(`ChallengeDetailScreen` 팔레트).

## [1.2.0] - 2026-04-26

### Added

- 챌린지 인증 시 참가자에게 **Expo 푸시 알림**(제목: 챌린지명, 본문: 인증자·글/사진 안내).
- Firebase **Cloud Functions**: 인증 디바운스, 조용한 시간(로컬 1~9시) 요약, 아침 요약 푸시.
- 챌린지 상세에서 **챌린지별 알림 끄기/켜기**(벨 아이콘).
- 앱 로그인 시 **Expo 푸시 토큰·타임존** Firestore 동기화.

### Changed

- 동일 사용자 짧은 연속 인증은 **한 번으로 묶어** 알림.
- 같은 날 인증 **수정(교체)** 시에는 참가자 푸시 없음.

### Technical

- `expo-notifications`, Firebase Functions (`functions/`), `firebase.json`, `.firebaserc`.
