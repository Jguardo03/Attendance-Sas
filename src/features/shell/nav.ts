import { useWindowDimensions } from 'react-native';

import type { IconName } from '@/components/icon';

// What the app's navigation offers and who sees it. Pure, so it can be tested without drawing anything.
// Phones get a bottom tab bar; wide screens (a desktop browser, a tablet on its side) get a left sidebar instead.

/** From this width the sidebar replaces the bottom bar (the desktop mockups are drawn at 1024 and up). */
export const WIDE_BREAKPOINT = 1024;

export const useIsWide = () => useWindowDimensions().width >= WIDE_BREAKPOINT;

export type NavGroup = 'overview' | 'account';
export type NavItem = {
  /** The name of the tab route in src/app/(app)/(tabs). */
  key: 'index' | 'classes' | 'calendar' | 'admin' | 'profile';
  label: string;
  icon: IconName;
  href: '/' | '/classes' | '/calendar' | '/admin' | '/profile';
  group: NavGroup;
};

const items: (NavItem & { permission?: string })[] = [
  { key: 'index', label: 'Home', icon: 'home', href: '/', group: 'overview' },
  { key: 'classes', label: 'Classes', icon: 'classes', href: '/classes', group: 'overview' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar', href: '/calendar', group: 'overview' },
  // Decided by the permission, never by the role's name.
  { key: 'admin', label: 'Admin', icon: 'admin', href: '/admin', group: 'overview', permission: 'admin.access' },
  { key: 'profile', label: 'Profile', icon: 'profile', href: '/profile', group: 'account' },
];

/** The destinations a person can see: everyone gets four, people with admin access get Admin as well. */
export function navItems(can: (permissionKey: string) => boolean): NavItem[] {
  return items.filter((item) => !item.permission || can(item.permission)).map(({ permission: _permission, ...item }) => item);
}

/** Whether a destination is the current page. Home is only the exact root; the others also cover their sub pages. */
export function isActive(item: Pick<NavItem, 'href'>, pathname: string): boolean {
  if (item.href === '/') return pathname === '/' || pathname === '';
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** "student" to "Student". */
export const roleLabel = (role: string | null | undefined) => (role ? role.charAt(0).toUpperCase() + role.slice(1) : '');
