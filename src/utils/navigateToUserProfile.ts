import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

/**
 * Opens another member's profile, or the Profile tab when the target is the current user.
 */
export function navigateToUserProfile(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  userId: string,
  currentUserId: string | undefined,
) {
  if (currentUserId && userId === currentUserId) {
    navigation.navigate('MainTabs', { screen: 'Profile' });
  } else {
    navigation.navigate('UserProfile', { userId });
  }
}
