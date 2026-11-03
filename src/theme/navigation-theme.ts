import { DefaultTheme } from 'expo-router';

import { colors } from './tokens';

// The navigation theme (screen background, headers, tab bar defaults). Built from expo-router's own DefaultTheme so
// every key it needs is present, with the Attendancely palette and Inter. Light only: there is no dark theme.
export const appTheme: typeof DefaultTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.surfaceMuted,
    card: colors.surface,
    text: colors.content,
    border: colors.border,
    notification: colors.danger,
  },
  fonts: {
    regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' },
    medium: { fontFamily: 'Inter_500Medium', fontWeight: '500' },
    bold: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
    heavy: { fontFamily: 'Inter_700Bold', fontWeight: '700' },
  },
};
