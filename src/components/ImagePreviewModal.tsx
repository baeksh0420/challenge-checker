import React from 'react';
import {
  Modal,
  View,
  Pressable,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';

type Props = {
  visible: boolean;
  imageUri: string | null | undefined;
  onClose: () => void;
};

export default function ImagePreviewModal({ visible, imageUri, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const topInset =
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 52;
  const uri = typeof imageUri === 'string' && imageUri.length > 0 ? imageUri : null;
  const open = visible && !!uri;

  const imgW = Math.max(1, width - 28);
  const imgH = Math.min(height * 0.74, imgW * 1.35);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.fillCenter, { paddingTop: topInset + 8, paddingHorizontal: 14 }]}
          onPress={onClose}
          accessibilityLabel="닫기"
        >
          <Pressable onPress={() => {}} accessibilityRole="image">
            <Image
              source={{ uri: uri! }}
              style={{ width: imgW, height: imgH }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </Pressable>
        </Pressable>
        <View
          style={[styles.hintWrap, { bottom: Platform.OS === 'ios' ? 34 : 22 }]}
          pointerEvents="none"
        >
          <Text style={styles.hint}>배경을 탭하면 닫아요</Text>
        </View>
        <Pressable
          style={[styles.closeBtn, { top: topInset }]}
          onPress={onClose}
          hitSlop={14}
          accessibilityLabel="닫기"
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  fillCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 14,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '300',
  },
  hintWrap: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1,
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
});
