import React, { useState } from 'react';
import {
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAppContext } from '../store/AppContext';
import { androidTopInsetStyle } from '../utils/androidTopInset';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';

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

function mapPasswordResetError(code?: string): string {
  const c = code ?? '';
  if (c === 'auth/invalid-email') return '올바른 이메일 형식이 아닙니다.';
  if (c === 'auth/missing-email') return '이메일 주소를 입력해 주세요.';
  if (c === 'auth/user-not-found') {
    return '해당 이메일로 가입된 계정이 없을 수 있습니다. 입력을 확인해 주세요.';
  }
  if (c === 'auth/too-many-requests') return '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  if (c === 'auth/network-request-failed') {
    return '네트워크 오류입니다. 연결을 확인해 주세요.';
  }
  return '메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export default function LoginScreen() {
  const { actions, state } = useAppContext();
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
    <SafeAreaView style={[styles.container, androidTopInsetStyle()]}>
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
          <Image
            source={require('../../assets/login-mark.png')}
            style={styles.loginMark}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Challenge Checker"
          />
          <Text style={styles.title}>Challenge Checker</Text>
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

          {!isSignUp ? (
            <TouchableOpacity
              style={styles.forgotPasswordBtn}
              onPress={async () => {
                if (!trimmedEmail) {
                  Alert.alert(
                    '비밀번호 찾기',
                    '가입하신 이메일 주소를 위 입력란에 적은 뒤 다시 눌러 주세요.',
                  );
                  return;
                }
                setBusy(true);
                try {
                  await actions.requestPasswordResetEmail(trimmedEmail);
                  Alert.alert(
                    '메일 발송',
                    `${trimmedEmail} 로 비밀번호 재설정 안내 메일을 보냈습니다.\n메일함(스팸함 포함)을 확인해 주세요.`,
                  );
                } catch (e: unknown) {
                  const err = e as { code?: string };
                  Alert.alert(
                    '비밀번호 찾기',
                    mapPasswordResetError(err.code),
                  );
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              <Text style={styles.forgotPasswordText}>비밀번호 찾기</Text>
            </TouchableOpacity>
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

          {state.authError ? (
            <Text style={styles.authError}>{state.authError}</Text>
          ) : (
            <Text style={styles.hint}>
              비밀번호는 Firebase Authentication에만 저장되며,Firestore에는 이메일·프로필만
              저장됩니다.
            </Text>
          )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 36,
    paddingBottom: 64,
  },
  loginMark: {
    width: 88,
    height: 88,
    alignSelf: 'center',
    marginBottom: 16,
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
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
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
  authError: {
    marginTop: 24,
    fontSize: 13,
    color: '#EF4444',
    lineHeight: 18,
    textAlign: 'center',
  },
});
