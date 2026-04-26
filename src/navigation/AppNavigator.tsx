import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList } from '../types';
import { useAppContext } from '../store/AppContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import BoardListScreen from '../screens/BoardListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreateChallengeScreen from '../screens/CreateChallengeScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import ChallengeBoardScreen from '../screens/ChallengeBoardScreen';
import CheckInScreen from '../screens/CheckInScreen';
import JoinByCodeScreen from '../screens/JoinByCodeScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const barPadTop = 6;
  const barPadBottom = 2 + insets.bottom;
  // 탭 아이콘+라벨 + 위·아래 + iPhone 홈 인디케이터(safe area)
  const tabBarHeight = 44 + barPadTop + barPadBottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          paddingTop: barPadTop,
          paddingBottom: barPadBottom,
          height: tabBarHeight,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Board') {
            iconName = focused ? 'newspaper' : 'newspaper-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: '홈' }}
      />
      <Tab.Screen
        name="Board"
        component={BoardListScreen}
        options={{ tabBarLabel: '게시판' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: '프로필' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { state } = useAppContext();
  const isLoggedIn = !!state.currentUser;

  if (state.authLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#F9FAFB' },
            headerTintColor: '#1F2937',
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateChallenge"
            component={CreateChallengeScreen}
            options={({ route }) => ({
              title: route.params?.editChallengeId ? '챌린지 수정' : '챌린지 만들기',
            })}
          />
          <Stack.Screen
            name="ChallengeDetail"
            component={ChallengeDetailScreen}
            options={{ headerTitle: '' }}
          />
          <Stack.Screen
            name="ChallengeBoard"
            component={ChallengeBoardScreen}
            options={{ title: '게시판' }}
          />
          <Stack.Screen
            name="CheckIn"
            component={CheckInScreen}
            options={{ title: '인증하기' }}
          />
          <Stack.Screen
            name="JoinByCode"
            component={JoinByCodeScreen}
            options={{ title: '초대 코드 입력' }}
          />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={{ title: '프로필' }}
          />
        </Stack.Navigator>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
