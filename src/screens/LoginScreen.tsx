import React, { useState } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAppContext } from '../store/AppContext';

function mapAuthError(message: string, code?: string): string {
  const c = code ?? '';
  if (c === 'auth/email-already-in-use') return '이미 사용 중인 이메일입니다.';
  if (c === 'auth/invalid-email') return '올바른 이메일 형식이 아닙니다.';
  if (c === 'auth/weak-password') return '비밀번호는 6자 이상으로 설정해 주세요.';
  if (c === 'auth/user-not-found' || c === 'auth/wrong-password' || c === 'auth/invalid-credential') {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (c === 'auth/too-many-requests') return '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  if (message) return message;
  return '오류가 발생했습니다. 다시 시도해 주세요.';
}

export default function LoginScreen() {
  const { actions } = useAppContext();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmedEmail = email.trim();
  const passwordsMatch = !isSignUp || password === confirmPassword;
  const canSubmit =
    trimmedEmail.length > 0 &&
    password.length >= 6 &&
    (!isSignUp || displayName.trim().length > 0) &&
    passwordsMatch;

  const handleSubmit = async () => {
    if (!canSubmit || busy) return;
    if (isSignUp && password !== confirmPassword) {
      Alert.alert('회원가입', '비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setBusy(true);
    try {
      if (isSignUp) {
        await actions.signUpWithEmailPassword(
          trimmedEmail,
          password,
          displayName.trim()
        );
      } else {
        await actions.signInWithEmailPassword(trimmedEmail, password);
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      Alert.alert(
        isSignUp ? '회원가입 실패' : '로그인 실패',
        mapAuthError(err.message ?? '', err.code)
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.emoji}>🏆</Text>
          <Text style={styles.title}>챌린지체커</Text>
          <Text style={styles.subtitle}>
            이메일과 비밀번호로{'\n'}
            {isSignUp ? '새 계정을 만드세요' : '로그인하세요'}
          </Text>

          {isSignUp ? (
            <TextInput
              style={styles.input}
              placeholder="닉네임"
              placeholderTextColor="#9CA3AF"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!busy}
          />

          <TextInput
            style={styles.input}
            placeholder="비밀번호 (6자 이상)"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isSignUp ? 'password-new' : 'password'}
            editable={!busy}
          />

          {isSignUp ? (
            <TextInput
              style={styles.input}
              placeholder="비밀번호 확인"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              editable={!busy}
            />
          ) : null}

          {isSignUp && confirmPassword.length > 0 && password !== confirmPassword ? (
            <Text style={styles.fieldError}>비밀번호가 서로 일치하지 않습니다.</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, (!canSubmit || busy) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || busy}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isSignUp ? '회원가입' : '로그인'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setConfirmPassword('');
            }}
            disabled={busy}
          >
            <Text style={styles.switchBtnText}>
              {isSignUp ? '이미 계정이 있어요 → 로그인' : '계정이 없어요 → 회원가입'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            비밀번호는 Firebase Authentication에만 저장되며,Firestore에는 이메일·프로필만
            저장됩니다.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 48,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchBtn: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  switchBtnText: {
    fontSize: 15,
    color: '#4F46E5',
    fontWeight: '600',
  },
  hint: {
    marginTop: 24,
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    textAlign: 'center',
  },
  fieldError: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 4,
    marginTop: -4,
  },
});
