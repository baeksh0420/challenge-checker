import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function resolveEasProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
}

/**
 * Expo 푸시 토큰·기기 타임존을 Firestore 사용자 문서에 반영합니다.
 * 실제 기기에서만 동작하며, 웹·시뮬레이터는 건너뜁니다.
 */
export async function syncExpoPushTokenToProfile(
  userId: string,
  updateProvisioning: (
    uid: string,
    fields: { expoPushToken?: string | null; pushTimeZone?: string }
  ) => Promise<void>
): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  const next =
    existing === 'granted'
      ? existing
      : (await Notifications.requestPermissionsAsync()).status;
  if (next !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기본',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = resolveEasProjectId();
  if (!projectId) {
    console.warn('[push] EAS projectId 없음 — app.json extra.eas.projectId 확인');
    return;
  }

  const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenRes.data;
  const pushTimeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Asia/Seoul';

  await updateProvisioning(userId, { expoPushToken: token, pushTimeZone });
}
