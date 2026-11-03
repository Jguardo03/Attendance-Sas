import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { ScreenHeader } from '@/components/ui';
import { AppShell } from '@/features/shell/app-shell';
import { BottomTabBar } from '@/features/shell/bottom-tab-bar';
import { WIDE_BREAKPOINT, isActive, navItems, roleLabel } from '@/features/shell/nav';
import { Sidebar } from '@/features/shell/sidebar';
import { UserChip } from '@/features/shell/user-chip';
import { colors } from '@/theme/tokens';

const mockPush = jest.fn();
const mockSignOut = jest.fn();
let mockPathname = '/';
let mockPermissions: string[] = [];
let mockWide = true;
let mockProfile: { first_name: string; last_name: string } | undefined = { first_name: 'Alex', last_name: 'Admin' };

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/providers/auth', () => ({
  useAuth: () => ({ can: (key: string) => mockPermissions.includes(key), signOut: mockSignOut, claims: { appUserId: 'A1000001', role: 'admin' } }),
}));
jest.mock('@/features/shell/use-my-profile', () => ({ useMyProfile: () => ({ data: mockProfile, isPending: false }) }));
jest.mock('@/features/shell/nav', () => ({ ...jest.requireActual('@/features/shell/nav'), useIsWide: () => mockWide }));

const student = ['attendance.check_in'];
const admin = ['admin.access', 'attendance.view_all'];
const hidden = { includeHiddenElements: true } as const;

beforeEach(() => {
  mockPush.mockReset();
  mockSignOut.mockReset();
  mockPathname = '/';
  mockPermissions = student;
  mockWide = true;
  mockProfile = { first_name: 'Alex', last_name: 'Admin' };
});

describe('navigation items', () => {
  it('gives everyone four destinations and people with admin access a fifth', () => {
    expect(navItems((key) => student.includes(key)).map((item) => item.label)).toEqual(['Home', 'Classes', 'Calendar', 'Profile']);
    expect(navItems((key) => admin.includes(key)).map((item) => item.label)).toEqual(['Home', 'Classes', 'Calendar', 'Admin', 'Profile']);
  });

  it('decides Admin by the permission, never by a role name', () => {
    expect(navItems((key) => key === 'admin.access').some((item) => item.label === 'Admin')).toBe(true);
    expect(navItems(() => false).some((item) => item.label === 'Admin')).toBe(false);
  });

  it('puts Profile in the account group and the rest in the overview group', () => {
    const items = navItems(() => true);
    expect(items.filter((item) => item.group === 'account').map((item) => item.label)).toEqual(['Profile']);
    expect(items.filter((item) => item.group === 'overview')).toHaveLength(4);
  });

  it('knows the current page: Home only at the root, the others also on their sub pages', () => {
    const [home, classes] = navItems(() => true);
    expect(isActive(home, '/')).toBe(true);
    expect(isActive(home, '/classes')).toBe(false);
    expect(isActive(classes, '/classes')).toBe(true);
    expect(isActive(classes, '/classes/5')).toBe(true);
    expect(isActive(classes, '/class/5')).toBe(false);
    expect(isActive(classes, '/')).toBe(false);
  });

  it('shows the sidebar from 1024 px wide', () => {
    expect(WIDE_BREAKPOINT).toBe(1024);
    expect(roleLabel('student')).toBe('Student');
    expect(roleLabel(null)).toBe('');
  });
});

describe('Sidebar', () => {
  it('shows the groups and the destinations, with Admin only for admins', async () => {
    await render(<Sidebar />);
    for (const label of ['Attendancely', 'Overview', 'Account', 'Home', 'Classes', 'Calendar', 'Profile', 'Sign out']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('adds Admin for a person with admin access', async () => {
    mockPermissions = admin;
    await render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Admin' })).toBeTruthy();
  });

  it('marks the current page and goes to a page when pressed', async () => {
    mockPathname = '/classes';
    await render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Classes' })).toBeSelected();
    expect(screen.getByRole('link', { name: 'Home' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('link', { name: 'Calendar' }));
    expect(mockPush).toHaveBeenCalledWith('/calendar');
  });

  it('asks before signing out, and can be cancelled', async () => {
    await render(<Sidebar />);
    expect(screen.queryByText('Sign out?')).toBeNull();
    await fireEvent.press(screen.getByRole('link', { name: 'Sign out' }));
    expect(screen.getByText('Sign out?')).toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Sign out?')).toBeNull();
  });

  it('signs out once confirmed', async () => {
    await render(<Sidebar />);
    await fireEvent.press(screen.getByRole('link', { name: 'Sign out' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

describe('UserChip', () => {
  it('shows the initials, the name and the role', async () => {
    await render(<UserChip />);
    expect(screen.getByText('Alex Admin')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByLabelText('Alex Admin, Admin')).toBeTruthy();
    expect(screen.getByText('AA', hidden)).toBeTruthy();
  });

  it('still shows the role while the name loads', async () => {
    mockProfile = undefined;
    await render(<UserChip />);
    expect(screen.getByText('Admin')).toBeTruthy();
  });
});

describe('AppShell', () => {
  it('wraps the page with the sidebar and the user chip on wide screens', async () => {
    await render(
      <AppShell>
        <ScreenHeader title="Page body" />
      </AppShell>,
    );
    expect(screen.getByText('Page body')).toBeTruthy();
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Alex Admin')).toBeTruthy();
  });

  it('shows only the page on a phone', async () => {
    mockWide = false;
    await render(
      <AppShell>
        <ScreenHeader title="Page body" />
      </AppShell>,
    );
    expect(screen.getByText('Page body')).toBeTruthy();
    expect(screen.queryByText('Overview')).toBeNull();
  });

  it('shows only the page while it is switched off (the first-launch permissions screen)', async () => {
    await render(
      <AppShell enabled={false}>
        <ScreenHeader title="Page body" />
      </AppShell>,
    );
    expect(screen.queryByText('Overview')).toBeNull();
  });
});

describe('BottomTabBar', () => {
  const routes = [
    { key: 'index-1', name: 'index' },
    { key: 'classes-1', name: 'classes' },
    { key: 'admin-1', name: 'admin' },
    { key: 'profile-1', name: 'profile' },
  ];
  beforeEach(() => {
    mockWide = false; // a phone: the bottom bar is the navigation
  });

  const props = (index: number, prevented = false) => {
    const emit = jest.fn(() => ({ defaultPrevented: prevented }));
    const navigateToTab = jest.fn();
    return { emit, navigateToTab, bar: { state: { index, routes }, emitter: { emit }, navigateToTab, insets: { top: 0, bottom: 12, left: 0, right: 0 } } as unknown as BottomTabBarProps };
  };

  it('shows an icon and a label for each allowed tab, marking the current one', async () => {
    const { bar } = props(0);
    await render(<BottomTabBar {...bar} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.queryByText('Admin')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Classes' })).not.toBeSelected();
    expect(screen.getByTestId('symbol:house', hidden).props.tintColor).toBe(colors.primary);
    expect(screen.getByTestId('symbol:books.vertical', hidden).props.tintColor).toBe(colors.contentMuted);
  });

  it('shows Admin to people with admin access', async () => {
    mockPermissions = admin;
    const { bar } = props(0);
    await render(<BottomTabBar {...bar} />);
    expect(screen.getByRole('tab', { name: 'Admin' })).toBeTruthy();
  });

  it('sends the press event, then opens the tab', async () => {
    const { bar, emit, navigateToTab } = props(0);
    await render(<BottomTabBar {...bar} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Classes' }));
    expect(emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'classes-1', canPreventDefault: true });
    expect(navigateToTab).toHaveBeenCalledWith('classes-1');
  });

  it('does not open a tab whose press was cancelled, or the one already open', async () => {
    const cancelled = props(0, true);
    await render(<BottomTabBar {...cancelled.bar} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Classes' }));
    expect(cancelled.navigateToTab).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    expect(cancelled.navigateToTab).not.toHaveBeenCalled();
  });

  it('draws nothing on wide screens, where the sidebar does the job', async () => {
    mockWide = true;
    const { bar } = props(0);
    await render(<BottomTabBar {...bar} />);
    expect(screen.queryByRole('tab')).toBeNull();
  });
});

describe('ScreenHeader', () => {
  it('shows the title, a second line and a status pill', async () => {
    await render(<ScreenHeader title="Web Development" subtitle="2026 Term 4" status={{ label: 'Live', tone: 'live', dot: true }} />);
    expect(screen.getByText('Web Development')).toBeTruthy();
    expect(screen.getByText('2026 Term 4')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('has a back button only when it is given somewhere to go', async () => {
    const onBack = jest.fn();
    await render(<ScreenHeader title="With back" onBack={onBack} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('has no back button without onBack', async () => {
    await render(<ScreenHeader title="No back" />);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });
});
