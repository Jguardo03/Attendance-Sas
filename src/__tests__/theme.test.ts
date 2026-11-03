import { colors, kebab, radii, rgbTriplet, typeScale, type ColorToken } from '@/theme/tokens';

// The project has no Node type definitions, so the two Node modules used to read the config files are typed by hand.
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs') as { readFileSync(file: string, encoding: string): string };
const path = require('path') as { join(...parts: string[]): string; resolve(...parts: string[]): string };
/* eslint-enable @typescript-eslint/no-require-imports */

// Jest runs from the project root (npm test).
const root = path.resolve('.');
const css = fs.readFileSync(path.join(root, 'src', 'global.css'), 'utf8');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwind = require(path.join(root, 'tailwind.config.js')) as {
  darkMode: string;
  theme: { extend: { colors: Record<string, string>; borderRadius: Record<string, string>; fontFamily: Record<string, string[]>; fontSize: Record<string, [string, { lineHeight: string }]> } };
};
const names = Object.keys(colors) as ColorToken[];

function cssVariables(): Record<string, string> {
  const rootBlock = /:root\s*{([^}]*)}/.exec(css)?.[1] ?? '';
  return Object.fromEntries([...rootBlock.matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
}

// WCAG 2 contrast ratio between two hex colours.
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = rgbTriplet(hex).split(' ').map((part) => {
      const value = Number(part) / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe('design tokens', () => {
  it('match the CSS variables value for value (no drift between tokens.ts and global.css)', () => {
    const variables = cssVariables();
    for (const name of names) {
      expect({ name, value: variables[`--color-${kebab(name)}`] }).toEqual({ name, value: rgbTriplet(colors[name]) });
    }
  });

  it('have no CSS variable that tokens.ts does not know', () => {
    expect(Object.keys(cssVariables()).sort()).toEqual(names.map((name) => `--color-${kebab(name)}`).sort());
  });

  it('are all exposed as tailwind colours that read their variable', () => {
    const configured = tailwind.theme.extend.colors;
    expect(Object.keys(configured).sort()).toEqual(names.map(kebab).sort());
    for (const name of names) expect(configured[kebab(name)]).toBe(`rgb(var(--color-${kebab(name)}) / <alpha-value>)`);
  });

  it('use the palette from the style sheet', () => {
    expect(colors).toMatchObject({
      primary: '#015C93',
      primaryDark: '#0A4570',
      primaryTint: '#EAF3FA',
      cream: '#FFF3DF',
      success: '#159357',
      warning: '#FCC101',
      danger: '#C24753',
      content: '#101828',
      contentMuted: '#667085',
      border: '#E4E7EC',
      surfaceMuted: '#F4F6FA',
    });
  });

  it('is a light theme only', () => {
    expect(tailwind.darkMode).toBe('class');
    expect(css).not.toMatch(/\.dark|prefers-color-scheme/);
  });
});

describe('shapes and type', () => {
  it('has the mockup radii in the tailwind theme', () => {
    expect(tailwind.theme.extend.borderRadius).toEqual({ card: `${radii.card}px`, block: `${radii.block}px`, button: `${radii.button}px` });
  });

  it('has the six type steps with the mockup sizes and line heights', () => {
    const { fontSize } = tailwind.theme.extend;
    for (const [step, spec] of Object.entries(typeScale)) {
      expect(fontSize[step]).toEqual([`${spec.size}px`, { lineHeight: `${spec.lineHeight}px` }]);
    }
  });

  it('has one Inter family per weight, matching the names loaded in the root layout', () => {
    const families = Object.values(tailwind.theme.extend.fontFamily).flat().sort();
    expect(families).toEqual(['Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'Inter_700Bold']);
    for (const spec of Object.values(typeScale)) expect(families).toContain(spec.family);
    const layout = fs.readFileSync(path.join(root, 'src', 'app', '_layout.tsx'), 'utf8');
    for (const family of families) expect(layout).toContain(family);
  });
});

describe('contrast', () => {
  // Small text needs 4.5:1. Pairs here are the ones the mockups use; muted text is not placed on the primary tint
  // (4.43:1), and the base green is only used for large or graphic elements (3.9:1), never for small text.
  const text: [ColorToken, ColorToken][] = [
    ['content', 'surface'],
    ['content', 'surfaceMuted'],
    ['content', 'cream'],
    ['contentMuted', 'surface'],
    ['contentMuted', 'surfaceMuted'],
    ['contentMuted', 'cream'],
    ['primary', 'surface'],
    ['primary', 'surfaceMuted'],
    ['primary', 'primaryTint'],
    ['primaryContent', 'primary'],
    ['primaryContent', 'primaryDark'],
    ['primaryContent', 'danger'],
    ['primaryContent', 'successStrong'],
    ['danger', 'surface'],
    ['dangerStrong', 'surface'],
    ['dangerStrong', 'surfaceMuted'],
    ['dangerStrong', 'dangerTint'],
    ['successStrong', 'surface'],
    ['successStrong', 'successTint'],
    ['warningContent', 'warning'],
    ['warningContent', 'warningTint'],
  ];

  it.each(text)('%s on %s is at least 4.5:1', (foreground, background) => {
    expect(contrast(colors[foreground], colors[background])).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps graphic elements (rings, bars, status dots) at 3:1 on white', () => {
    for (const name of ['success', 'danger', 'primary'] as const) expect(contrast(colors[name], colors.surface)).toBeGreaterThanOrEqual(3);
  });

  it('knows white on the late yellow fails, which is why Late uses dark text', () => {
    expect(contrast(colors.primaryContent, colors.warning)).toBeLessThan(3);
    expect(colors.warningContent).toBe(colors.content);
  });
});
