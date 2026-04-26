import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useAppContext } from './src/store/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

function AppContent() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    if (!state.authLoading) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'SET_AUTH_LOADING', payload: false });
    }, 10000);
    return () => clearTimeout(timer);
  }, [state.authLoading, dispatch]);

  if (state.authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await Updates.checkForUpdateAsync();
        if (cancelled || !res.isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch {
        /* 네트워크 등 실패 시 기존 번들 유지 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppContent />
      </SafeAreaProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
});
