import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, type ScrollViewInstance } from 'react-native';

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

export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  const ref = useRef<ScrollViewInstance>(null);
  const scrollUp = useCallback(() => ref.current?.scrollTo({ y: 0, animated: true }), []);

  return (
    <ScrollUpContext.Provider value={scrollUp}>
      <ScrollView
        ref={ref}
        className="flex-1 bg-surface-muted"
        contentContainerClassName="mx-auto w-full max-w-3xl gap-4 p-4">
        <Text variant="title">{title}</Text>
        {children}
      </ScrollView>
    </ScrollUpContext.Provider>
  );
}
