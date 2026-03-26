import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useAppContext } from './src/store/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

function AppContent() {
  const { state } = useAppContext();

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
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <AppContent />
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
