import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './text';

const ScrollUpContext = createContext<() => void>(() => {});

/** Scrolls the surrounding Screen back to the top, where error messages are shown. */
export function useScrollUp() {
  return useContext(ScrollUpContext);
}

/** Scrolls the screen to the top each time `trigger` gets a new, non-empty value (an error appearing). */
export function useScrollUpOn(trigger: unknown) {
  const scrollUp = useScrollUp();
  useEffect(() => {
    if (trigger) scrollUp();
  }, [trigger, scrollUp]);
}

// `standalone` is for screens outside the tab bar (details, sign-in): the tab bar already keeps tab screens clear of
// the gesture bar, so only these need the bottom inset. The top inset keeps the title out from under the status bar.
// `header` replaces the plain title when a screen draws its own (the Home greeting, the check in result). `title` is
// still required: it names the screen.
export function Screen({ title, standalone = false, header, children }: { title: string; standalone?: boolean; header?: ReactNode; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollViewInstance>(null);
  const scrollUp = useCallback(() => ref.current?.scrollTo({ y: 0, animated: true }), []);

  return (
    <ScrollUpContext.Provider value={scrollUp}>
      <ScrollView
        ref={ref}
        className="flex-1 bg-surface-muted"
        contentContainerClassName="mx-auto w-full max-w-3xl gap-4 px-5"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: (standalone ? insets.bottom : 0) + 16 }}>
        {header ?? <Text variant="title">{title}</Text>}
        {children}
      </ScrollView>
    </ScrollUpContext.Provider>
  );
}
