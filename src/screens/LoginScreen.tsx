import React, { useEffect } from 'react';
import {
  Alert,
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAppContext } from '../store/AppContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { actions } = useAppContext();
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    const completeNativeGoogleSignIn = async () => {
      if (response?.type !== 'success') return;
      const idToken = response.authentication?.idToken ?? response.params?.id_token;
      if (!idToken) {
        Alert.alert('로그인 실패', 'Google ID 토큰을 가져오지 못했습니다.');
        return;
      }
      try {
        await actions.signInWithGoogleIdToken(idToken);
      } catch (error) {
        console.error('Google 로그인 실패:', error);
        Alert.alert('로그인 실패', 'Google 로그인 처리 중 오류가 발생했습니다.');
      }
    };

    completeNativeGoogleSignIn();
  }, [response, actions]);

  const handleGoogleLogin = async () => {
    try {
      if (Platform.OS === 'web') {
        await actions.signInWithGoogle();
        return;
      }

      if (!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) {
        Alert.alert(
          '설정 필요',
          'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID 환경변수를 설정한 뒤 다시 시도해주세요.'
        );
        return;
      }
      await promptAsync();
    } catch (error) {
      console.error('Google 로그인 실패:', error);
      Alert.alert('로그인 실패', 'Google 로그인 도중 오류가 발생했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.title}>챌린지 체커</Text>
        <Text style={styles.subtitle}>
          함께 챌린지를 진행하고{'\n'}서로의 진행 상황을 확인하세요
        </Text>

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleLogin}
          disabled={Platform.OS !== 'web' && !request}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleBtnText}>Google로 시작하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 12,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});
