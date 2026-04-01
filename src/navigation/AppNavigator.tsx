import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList } from '../types';
import { useAppContext } from '../store/AppContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import MyChallengesScreen from '../screens/MyChallengesScreen';
import BoardListScreen from '../screens/BoardListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreateChallengeScreen from '../screens/CreateChallengeScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import ChallengeBoardScreen from '../screens/ChallengeBoardScreen';
import CheckInScreen from '../screens/CheckInScreen';
import JoinByCodeScreen from '../screens/JoinByCodeScreen';
import AllMyChallengesScreen from '../screens/AllMyChallengesScreen';
import MyCheckInHistoryScreen from '../screens/MyCheckInHistoryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          paddingBottom: 12,
          paddingTop: 10,
          height: 68,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyChallenges') {
            iconName = focused ? 'today' : 'today-outline';
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
        name="MyChallenges"
        component={MyChallengesScreen}
        options={{ tabBarLabel: '오늘인증' }}
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
            options={{ title: '챌린지 상세' }}
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
            name="AllMyChallenges"
            component={AllMyChallengesScreen}
            options={{ title: '내 챌린지 전체' }}
          />
          <Stack.Screen
            name="MyCheckInHistory"
            component={MyCheckInHistoryScreen}
            options={{ title: '내 인증내역' }}
          />
        </Stack.Navigator>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
