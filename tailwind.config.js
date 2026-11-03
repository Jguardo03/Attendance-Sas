/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // The app has a light theme only. 'class' also avoids NativeWind web throwing "Cannot manually set color scheme"
  // when a lazily loaded route adds styles to <head> while darkMode is 'media'.
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Semantic tokens only. Values live in src/global.css (:root variables) and src/theme/tokens.ts,
      // so a design change is made in one place, not in screens.
      colors: {
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--color-surface-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        content: 'rgb(var(--color-content) / <alpha-value>)',
        'content-muted': 'rgb(var(--color-content-muted) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-content': 'rgb(var(--color-primary-content) / <alpha-value>)',
        'primary-dark': 'rgb(var(--color-primary-dark) / <alpha-value>)',
        'primary-tint': 'rgb(var(--color-primary-tint) / <alpha-value>)',
        cream: 'rgb(var(--color-cream) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        'success-strong': 'rgb(var(--color-success-strong) / <alpha-value>)',
        'success-tint': 'rgb(var(--color-success-tint) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        'warning-content': 'rgb(var(--color-warning-content) / <alpha-value>)',
        'warning-tint': 'rgb(var(--color-warning-tint) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        'danger-strong': 'rgb(var(--color-danger-strong) / <alpha-value>)',
        'danger-tint': 'rgb(var(--color-danger-tint) / <alpha-value>)',
      },
      // Mockup shapes: cards 20, inner blocks 14, buttons 12. Pills use rounded-full.
      borderRadius: {
        card: '20px',
        block: '14px',
        button: '12px',
      },
      // Inter, one family per weight: on native `font-bold` only sets the weight, never the family, so text uses these.
      // The family names are the keys given to useFonts in src/app/_layout.tsx.
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },
      // Type scale from the style sheet: Title 24, Section 17, Card 15, Body 14, Meta 13, Label 12.
      fontSize: {
        title: ['24px', { lineHeight: '32px' }],
        section: ['17px', { lineHeight: '24px' }],
        card: ['15px', { lineHeight: '22px' }],
        body: ['14px', { lineHeight: '20px' }],
        meta: ['13px', { lineHeight: '18px' }],
        label: ['12px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [],
};
