import React, { useRef, useEffect, useState } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  Keyboard,
  Platform,
  TextInput,
  KeyboardEvent,
} from 'react-native';

const DEFAULT_EXTRA_HEIGHT = 80;

type Measurable = {
  measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void;
};

function resolveMeasurableHost(focused: unknown): Measurable | null {
  if (focused == null) return null;
  const candidates: unknown[] = [];
  if (typeof focused === 'object' && focused !== null && 'current' in focused) {
    const cur = (focused as { current: unknown }).current;
    if (cur != null) candidates.push(cur);
  }
  candidates.push(focused);
  for (const c of candidates) {
    const m = c as { measureInWindow?: unknown };
    if (typeof m.measureInWindow === 'function') {
      return m as Measurable;
    }
  }
  return null;
}

export default function KeyboardAwareScrollView({
  children,
  extraScrollHeight = DEFAULT_EXTRA_HEIGHT,
  contentContainerStyle,
  style,
  ...rest
}: ScrollViewProps & { extraScrollHeight?: number }) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const [kbPadding, setKbPadding] = useState(0);

  useEffect(() => {
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      const kbHeight = e.endCoordinates.height;
      const kbScreenY = e.endCoordinates.screenY;
      setKbPadding(kbHeight + extraScrollHeight);

      requestAnimationFrame(() => {
        const focused = TextInput.State.currentlyFocusedInput();
        if (!focused || !scrollRef.current) return;

        const host = resolveMeasurableHost(focused);
        if (!host) return;

        try {
          host.measureInWindow((_x, y, _w, h) => {
            const inputBottom = y + h;
            const gap = 24;
            if (inputBottom + gap > kbScreenY) {
              const delta = inputBottom + gap - kbScreenY;
              scrollRef.current?.scrollTo({
                y: scrollY.current + delta,
                animated: true,
              });
            }
          });
        } catch {
          /* Fabric·레이아웃 타이밍 등으로 measure 실패 시 스크롤 보정 생략 */
        }
      });
    };

    const onHide = () => setKbPadding(0);

    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => {
      s1.remove();
      s2.remove();
    };
  }, [extraScrollHeight]);

  return (
    <ScrollView
      ref={scrollRef}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[
        contentContainerStyle,
        kbPadding > 0 && { paddingBottom: kbPadding },
      ]}
      onScroll={(e) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
