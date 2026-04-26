import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

const EXTRA_LINES_PX = 80;

export function useKeyboardPadding(extra = EXTRA_LINES_PX): number {
  const [padding, setPadding] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setPadding(e.endCoordinates.height + extra);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setPadding(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [extra]);

  return padding;
}
