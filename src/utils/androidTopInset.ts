import { Platform, StatusBar, type ViewStyle } from 'react-native';

/** 상태바 아래 추가 여백(dp) */
const EXTRA_TOP = 12;

/**
 * Android에서는 RN `SafeAreaView`가 상단 안전 영역을 거의 주지 않는 경우가 많아,
 * 상태바 높이 + 소량 여백을 패딩으로 넣습니다. iOS는 `undefined`를 반환합니다.
 */
export function androidTopInsetStyle(): ViewStyle | undefined {
  if (Platform.OS !== 'android') return undefined;
  const status = StatusBar.currentHeight ?? 24;
  return { paddingTop: status + EXTRA_TOP };
}
