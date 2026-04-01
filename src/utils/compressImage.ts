import * as ImageManipulator from 'expo-image-manipulator';

/** 인증 사진: 모바일 피드 기준으로 해상도·용량 제한 (업로드 속도 우선) */
const CHECKIN_MAX_WIDTH = 1024;
const CHECKIN_JPEG_QUALITY = 0.64;

export async function compressCheckInPhoto(uri: string): Promise<string> {
  const { uri: out } = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: CHECKIN_MAX_WIDTH } }],
    {
      compress: CHECKIN_JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return out;
}

/** 프로필 아바타 */
export async function compressAvatarPhoto(uri: string): Promise<string> {
  const { uri: out } = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 512 } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
  );
  return out;
}
