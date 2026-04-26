import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { useAppContext } from '../store/AppContext';
import { RootStackParamList, User } from '../types';
import { navigateToUserProfile } from '../utils/navigateToUserProfile';

type Props = {
  user: User | undefined;
  userId: string;
  size?: number;
  /** When there is no `photoURL`, used as the circle background (e.g. challenge accent). */
  initialBackgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  /** e.g. close a parent modal before navigating so the overlay does not stay visible. */
  beforeNavigate?: () => void;
};

export default function ProfileAvatarButton({
  user,
  userId,
  size = 36,
  initialBackgroundColor,
  style,
  beforeNavigate,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state } = useAppContext();
  const resolved = user ?? state.users.find((u) => u.id === userId);
  const initial = (resolved?.name?.trim()?.[0] ?? '?').toUpperCase();
  const bg = initialBackgroundColor ?? resolved?.avatarColor ?? '#9CA3AF';
  const radius = size / 2;

  return (
    <TouchableOpacity
      style={[{ marginRight: 8 }, style]}
      onPress={() => {
        beforeNavigate?.();
        navigateToUserProfile(navigation, userId, state.currentUser?.id);
      }}
      activeOpacity={0.75}
      accessibilityLabel={`${resolved?.name ?? '참가자'} 프로필로 이동`}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      {resolved?.photoURL ? (
        <Image
          source={{ uri: resolved.photoURL }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: '#E5E7EB',
          }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={userId}
          transition={100}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: size * 0.42,
              fontWeight: '700',
            }}
          >
            {initial}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
