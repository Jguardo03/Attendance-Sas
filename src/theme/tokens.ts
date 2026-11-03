// The single source of truth for the Attendancely look (docs/Mockups, Student UI page 1). Every colour the app shows
// comes from here. Classes (`bg-primary`, `text-content-muted`, ...) read the same values from the CSS variables in
// src/global.css, and a test (theme.test.ts) fails if the two drift apart. Use `colors` only where a plain value is
// needed (icon tint, SVG fill, navigation theme); everywhere else use the class names.

export const colors = {
  // Surfaces and text
  surface: '#FFFFFF',
  surfaceMuted: '#F4F6FA', // the app canvas ("Background" in the style sheet)
  border: '#E4E7EC',
  content: '#101828',
  contentMuted: '#667085',

  // Brand blue
  primary: '#015C93',
  primaryContent: '#FFFFFF',
  primaryDark: '#0A4570', // banners and gradients
  primaryTint: '#EAF3FA', // active navigation, Upcoming
  cream: '#FFF3DF', // class artwork background

  // Present: green. The strong variant is for small text and pills (the base green is 3.9:1 on white, below AA).
  success: '#159357',
  successStrong: '#0F7A46',
  successTint: '#E3F2EB',

  // Late: yellow. Text on it is always dark (`warningContent`).
  warning: '#FCC101',
  warningContent: '#101828',
  warningTint: '#FEF3CC',

  // Absent, errors, Sign out. Small red text uses the strong variant (the base red is 4.13:1 on its tint).
  danger: '#C24753',
  dangerStrong: '#B03A48',
  dangerTint: '#F8E9EA',
} as const;

export type ColorToken = keyof typeof colors;

// Corner radii: cards 20, inner blocks 14, buttons 12, pills fully round.
export const radii = { card: 20, block: 14, button: 12, pill: 999 } as const;

// Spacing on a 4 px grid.
export const spacing = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 } as const;

// Soft card shadow from the style sheet: 0 6px 20px rgba(16,24,40,.06).
export const shadows = {
  card: '0px 6px 20px rgba(16, 24, 40, 0.06)',
} as const;

// Type scale (size / line height) and the Inter family that goes with each step.
export const typeScale = {
  title: { size: 24, lineHeight: 32, family: 'Inter_700Bold' },
  section: { size: 17, lineHeight: 24, family: 'Inter_700Bold' },
  card: { size: 15, lineHeight: 22, family: 'Inter_600SemiBold' },
  body: { size: 14, lineHeight: 20, family: 'Inter_400Regular' },
  meta: { size: 13, lineHeight: 18, family: 'Inter_400Regular' },
  label: { size: 12, lineHeight: 16, family: 'Inter_600SemiBold' },
} as const;

/** "#015C93" to the "1 92 147" triplet the CSS variables use. */
export function rgbTriplet(hex: string): string {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16)).join(' ');
}

/** "surfaceMuted" to "surface-muted" (the class and CSS variable naming). */
export const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
