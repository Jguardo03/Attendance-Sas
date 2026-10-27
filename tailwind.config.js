/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Semantic tokens only. Values live in src/global.css (:root variables),
      // so a later design pass changes colors in one place, not in screens.
      colors: {
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--color-surface-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        content: 'rgb(var(--color-content) / <alpha-value>)',
        'content-muted': 'rgb(var(--color-content-muted) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-content': 'rgb(var(--color-primary-content) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
