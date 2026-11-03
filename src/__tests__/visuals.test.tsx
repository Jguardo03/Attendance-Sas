import { render, screen } from '@testing-library/react-native';

import { AppMark } from '@/components/app-mark';
import { Avatar } from '@/components/avatar';
import { BreakdownRing, ProgressBar, ProgressRing } from '@/components/charts';
import { ARTWORK_COUNT, ClassArtwork, artworkIndex } from '@/components/class-artwork';
import { Icon, icons, type IconName } from '@/components/icon';
import { UiGallery } from '@/features/dev/ui-gallery';
import { AVATAR_TONES, avatarTone, initials } from '@/lib/initials';
import { RING_THRESHOLD, barPercent, clampPercent, ringDash, ringSegments, ringTone } from '@/lib/ring';
import { colors } from '@/theme/tokens';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }) }));

// The Material Symbols table that expo-symbols draws from on Android and web.
const materialSymbols = require('../../node_modules/expo-symbols/build/android/symbols.json') as Record<string, unknown>;
const names = Object.keys(icons) as IconName[];

describe('icon registry', () => {
  it('gives every icon an iOS, Android and web name', () => {
    for (const name of names) {
      const entry = icons[name];
      expect([name, typeof entry.ios, entry.ios.length > 0]).toEqual([name, 'string', true]);
      expect([name, typeof entry.android, entry.android.length > 0]).toEqual([name, 'string', true]);
      expect(entry.web).toBe(entry.android);
    }
  });

  it('only uses Material Symbols that exist in the font table', () => {
    for (const name of names) expect([name, icons[name].android in materialSymbols]).toEqual([name, true]);
  });

  it('has the icons the mockups use', () => {
    for (const name of ['home', 'classes', 'calendar', 'profile', 'admin', 'bell', 'check', 'close', 'clock', 'pin', 'qr', 'bluetooth', 'nfc', 'pencil', 'signOut'] as const) {
      expect(names).toContain(name);
    }
  });
});

describe('Icon', () => {
  it('asks for the right symbol on each platform, tinted from the palette', async () => {
    await render(<Icon name="calendar" size={20} color="primary" />);
    const symbol = screen.getByTestId('symbol:calendar', { includeHiddenElements: true });
    expect(symbol.props.name).toEqual({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' });
    expect(symbol.props.size).toBe(20);
    expect(symbol.props.tintColor).toBe(colors.primary);
  });

  it('is hidden from screen readers unless it has a label', async () => {
    await render(
      <>
        <Icon name="check" />
        <Icon name="bell" label="Notifications" />
      </>,
    );
    expect(screen.getByTestId('symbol:checkmark', { includeHiddenElements: true }).props['aria-hidden']).toBe(true);
    expect(screen.getByLabelText('Notifications')).toBeTruthy();
  });
});

describe('app mark and artwork', () => {
  it('draws the mark with an accessible name, or none when decorative', async () => {
    await render(
      <>
        <AppMark />
        <AppMark label={null} variant="plain" />
      </>,
    );
    expect(screen.getAllByLabelText('Attendancely')).toHaveLength(1);
  });

  it('gives the same class the same artwork, and spreads classes over all four', () => {
    expect(artworkIndex(42)).toBe(artworkIndex(42));
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map(artworkIndex)).size).toBe(ARTWORK_COUNT);
    expect(artworkIndex(0)).toBe(0);
    expect(artworkIndex(-5)).toBe(1);
    for (const id of [0, 1, 2, 3, 99, 12345]) expect(artworkIndex(id)).toBeGreaterThanOrEqual(0);
  });

  it('renders every pattern', async () => {
    for (let id = 0; id < ARTWORK_COUNT; id++) {
      const { unmount } = await render(<ClassArtwork classId={id} />);
      await unmount();
    }
  });
});

describe('ring and bar maths', () => {
  it('is green from 75 up, red below, neutral without a number', () => {
    expect(RING_THRESHOLD).toBe(75);
    expect(ringTone(74)).toBe('danger');
    expect(ringTone(74.9)).toBe('danger');
    expect(ringTone(75)).toBe('success');
    expect(ringTone(100)).toBe('success');
    expect(ringTone(0)).toBe('danger');
    expect(ringTone(null)).toBe('neutral');
    expect(ringTone(undefined)).toBe('neutral');
    expect(ringTone(Number.NaN)).toBe('neutral');
  });

  it('works out the coloured arc of a ring', () => {
    const half = ringDash(10, 50);
    expect(half.circumference).toBeCloseTo(2 * Math.PI * 10);
    expect(half.dash).toBeCloseTo(Math.PI * 10);
    expect(half.dash + half.gap).toBeCloseTo(half.circumference);
    expect(ringDash(10, 0).dash).toBe(0);
    expect(ringDash(10, 100).gap).toBeCloseTo(0);
    expect(ringDash(10, 250).dash).toBeCloseTo(ringDash(10, 100).dash);
    expect(clampPercent(-5)).toBe(0);
  });

  it('splits a ring by present, late and absent, each arc starting where the last ended', () => {
    const { total, attendedPercent, segments } = ringSegments({ present: 22, late: 3, absent: 3 }, 20);
    expect(total).toBe(28);
    expect(attendedPercent).toBe(89);
    expect(segments.map((segment) => segment.key)).toEqual(['present', 'late', 'absent']);
    const circumference = 2 * Math.PI * 20;
    expect(segments.reduce((sum, segment) => sum + segment.dash, 0)).toBeCloseTo(circumference);
    expect(segments[0].offset).toBe(-0);
    expect(segments[1].offset).toBeCloseTo(-segments[0].dash);
    expect(segments[2].offset).toBeCloseTo(-(segments[0].dash + segments[1].dash));
  });

  it('leaves out empty arcs and draws nothing when there are no sessions', () => {
    expect(ringSegments({ present: 5, late: 0, absent: 0 }, 20).segments.map((segment) => segment.key)).toEqual(['present']);
    expect(ringSegments({ present: 0, late: 0, absent: 0 }, 20)).toEqual({ total: 0, attendedPercent: null, segments: [] });
  });

  it('fills a bar by value over max, clamped, and leaves it empty when there is nothing to count', () => {
    expect(barPercent(18, 24)).toBe(75);
    expect(barPercent(30, 24)).toBe(100);
    expect(barPercent(-1, 24)).toBe(0);
    expect(barPercent(0, 22)).toBe(0);
    expect(barPercent(3, 0)).toBe(0);
  });
});

describe('charts', () => {
  it('names the percentage for screen readers', async () => {
    await render(
      <>
        <ProgressRing value={92.4} label="Class attendance" />
        <ProgressRing value={null} />
        <BreakdownRing present={22} late={3} absent={3} />
        <BreakdownRing present={0} late={0} absent={0} />
      </>,
    );
    expect(screen.getByLabelText('Class attendance: 92%')).toBeTruthy();
    expect(screen.getByLabelText('Attendance: no sessions yet')).toBeTruthy();
    expect(screen.getByLabelText('89% attended: 22 present, 3 late, 3 absent')).toBeTruthy();
    expect(screen.getByLabelText('No sessions yet')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.getByText('89%')).toBeTruthy();
  });

  it('shows a dash instead of a number when there is none', async () => {
    await render(<ProgressRing value={null} />);
    expect(screen.getByText('-')).toBeTruthy();
  });

  it('reports a progress bar value and fills the right share', async () => {
    await render(<ProgressBar value={18} max={24} label="18 of 24" />);
    const bar = screen.getByLabelText('18 of 24');
    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 24, now: 18 });
  });
});

describe('avatars', () => {
  it('takes initials from the first and last word', () => {
    expect(initials('Sara Ali')).toBe('SA');
    expect(initials('  Maria  de la Cruz ')).toBe('MC');
    expect(initials('Madonna')).toBe('M');
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
  });

  it('keeps a person on the same colour, spread over five', () => {
    expect(avatarTone('S1000008')).toBe(avatarTone('S1000008'));
    const seen = new Set(Array.from({ length: 40 }, (_, index) => avatarTone(`S10000${index}`)));
    expect(seen.size).toBe(AVATAR_TONES);
    for (const tone of seen) expect(tone).toBeLessThan(AVATAR_TONES);
  });

  it('shows the initials', async () => {
    await render(<Avatar name="Noah Brown" id="S1000004" />);
    // The initials are decorative (the person's name is shown beside the avatar), so they are hidden from screen readers.
    expect(screen.getByText('NB', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('UI gallery', () => {
  it('shows every colour, every icon and every pattern', async () => {
    await render(<UiGallery />);
    for (const name of Object.keys(colors)) expect(screen.getByLabelText(new RegExp(`^${name} #`))).toBeTruthy();
    for (const name of names) expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    expect(screen.getByText(`Icons (${names.length})`)).toBeTruthy();
    for (let index = 1; index <= ARTWORK_COUNT; index++) expect(screen.getByText(new RegExp(`^Pattern ${index} `))).toBeTruthy();
  });
});
