import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useAppContext } from '../store/AppContext';
import { RootStackParamList } from '../types';
import { androidTopInsetStyle } from '../utils/androidTopInset';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ImagePreviewModal from '../components/ImagePreviewModal';
import ProfileMyChallengesTab from './profile/ProfileMyChallengesTab';
import ProfileResultSummaryTab from './profile/ProfileResultSummaryTab';

type R = RouteProp<RootStackParamList, 'UserProfile'>;
type ProfileTab = 'challenges' | 'summary';

export default function UserProfileScreen() {
  const route = useRoute<R>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'UserProfile'>>();
  const { userId } = route.params;
  const { state } = useAppContext();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>('challenges');
  const myId = state.currentUser?.id;

  const user = useMemo(
    () => state.users.find((u) => u.id === userId),
    [state.users, userId],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: '#FFFFFF' },
    });
  }, [navigation]);

  useEffect(() => {
    if (userId === myId && myId) {
      navigation.replace('MainTabs', { screen: 'Profile' });
    }
  }, [userId, myId, navigation]);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, androidTopInsetStyle()]}>
        <View style={styles.missingCard}>
          <Text style={styles.missingText}>이 사용자를 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const gridTitle = `${user.name}님의 인증`;

  return (
    <SafeAreaView style={[styles.container, androidTopInsetStyle()]}>
      <View style={styles.flex}>
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <TouchableOpacity
              style={[styles.avatarWrap, styles.avatarAlignSelf]}
              activeOpacity={0.85}
              onPress={() => {
                if (user.photoURL) setPreviewUri(user.photoURL);
              }}
              accessibilityLabel={
                user.photoURL ? '프로필 사진 크게 보기' : undefined
              }
            >
              <View style={styles.avatarInner}>
                {user.photoURL ? (
                  <Image
                    source={{ uri: user.photoURL }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    recyclingKey={userId}
                    transition={120}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: user.avatarColor ?? '#9CA3AF' },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {user.name?.[0] ?? '?'}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.profileInfoCol}>
              <View style={styles.profileNameBlock}>
                <Text style={styles.userName} selectable numberOfLines={2}>
                  {user.name}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabHit}
            onPress={() => setTab('challenges')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabLabel,
                tab === 'challenges' && styles.tabLabelActive,
              ]}
            >
              챌린지
            </Text>
            {tab === 'challenges' ? (
              <View style={styles.tabUnderline} />
            ) : (
              <View style={styles.tabUnderlinePlaceholder} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabHit}
            onPress={() => setTab('summary')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabLabel,
                tab === 'summary' && styles.tabLabelActive,
              ]}
            >
              결과 요약
            </Text>
            {tab === 'summary' ? (
              <View style={styles.tabUnderline} />
            ) : (
              <View style={styles.tabUnderlinePlaceholder} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.tabPanel}>
          {tab === 'challenges' ? (
            <ProfileMyChallengesTab
              subjectUserId={userId}
              mutualWithUserId={myId ?? undefined}
              gridSectionTitle={gridTitle}
            />
          ) : (
            <ProfileResultSummaryTab
              subjectUserId={userId}
              mutualWithUserId={myId ?? undefined}
            />
          )}
        </View>
      </View>

      {user.photoURL ? (
        <ImagePreviewModal
          visible={previewUri !== null}
          imageUri={previewUri ?? undefined}
          onClose={() => setPreviewUri(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  avatarAlignSelf: {
    alignSelf: 'flex-start',
  },
  avatarWrap: {
    marginRight: 14,
  },
  avatarInner: {
    width: 72,
    height: 72,
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E5E7EB',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  profileInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  profileNameBlock: {
    flexShrink: 0,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 26,
    includeFontPadding: false,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 8,
  },
  tabHit: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 0,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
    paddingBottom: 10,
  },
  tabLabelActive: {
    color: '#111827',
    fontWeight: '700',
  },
  tabUnderline: {
    height: 3,
    width: '100%',
    backgroundColor: '#111827',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  tabUnderlinePlaceholder: {
    height: 3,
    width: '100%',
    backgroundColor: 'transparent',
  },
  tabPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    minHeight: 0,
  },
  missingCard: { padding: 32, alignItems: 'center' },
  missingText: { fontSize: 15, color: '#6B7280' },
});
