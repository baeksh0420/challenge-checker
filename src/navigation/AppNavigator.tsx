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
import ProfileScreen from '../screens/ProfileScreen';
import CreateChallengeScreen from '../screens/CreateChallengeScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import CheckInScreen from '../screens/CheckInScreen';
import JoinByCodeScreen from '../screens/JoinByCodeScreen';

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
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyChallenges') {
            iconName = focused ? 'trophy' : 'trophy-outline';
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
        options={{ tabBarLabel: '내 챌린지' }}
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
            options={{ title: '챌린지 만들기' }}
          />
          <Stack.Screen
            name="ChallengeDetail"
            component={ChallengeDetailScreen}
            options={{ title: '챌린지 상세' }}
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
        </Stack.Navigator>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
