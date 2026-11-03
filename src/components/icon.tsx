import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

import { colors, type ColorToken } from '@/theme/tokens';

// One name for each icon the mockups use, mapped to the right symbol on every platform: iOS draws SF Symbols,
// Android and web draw Material Symbols. (A plain string name would render on iOS only, so every entry is a pair.)
const icon = (ios: SFSymbol, material: AndroidSymbol) => ({ ios, android: material, web: material }) as const;

export const icons = {
  // Navigation
  home: icon('house', 'home'),
  classes: icon('books.vertical', 'menu_book'),
  calendar: icon('calendar', 'calendar_month'),
  profile: icon('person', 'person'),
  admin: icon('shield', 'admin_panel_settings'),
  bell: icon('bell', 'notifications'),
  signOut: icon('rectangle.portrait.and.arrow.right', 'logout'),
  // Actions and controls
  check: icon('checkmark', 'check'),
  close: icon('xmark', 'close'),
  plus: icon('plus', 'add'),
  minus: icon('minus', 'remove'),
  pencil: icon('pencil', 'edit'),
  trash: icon('trash', 'delete'),
  search: icon('magnifyingglass', 'search'),
  filter: icon('line.3.horizontal.decrease', 'filter_list'),
  refresh: icon('arrow.clockwise', 'refresh'),
  share: icon('square.and.arrow.up', 'share'),
  download: icon('arrow.down.to.line', 'download'),
  chevronLeft: icon('chevron.left', 'chevron_left'),
  chevronRight: icon('chevron.right', 'chevron_right'),
  chevronDown: icon('chevron.down', 'expand_more'),
  chevronUp: icon('chevron.up', 'expand_less'),
  // Information and status
  clock: icon('clock', 'schedule'),
  pin: icon('mappin.and.ellipse', 'location_on'),
  info: icon('info.circle', 'info'),
  warning: icon('exclamationmark.triangle', 'warning'),
  error: icon('exclamationmark.circle', 'error'),
  checkCircle: icon('checkmark.circle', 'check_circle'),
  lock: icon('lock', 'lock'),
  eye: icon('eye', 'visibility'),
  // Check in methods
  qr: icon('qrcode', 'qr_code_2'),
  qrScan: icon('qrcode.viewfinder', 'qr_code_scanner'),
  bluetooth: icon('dot.radiowaves.left.and.right', 'bluetooth'),
  nfc: icon('wave.3.right', 'nfc'),
  hand: icon('hand.raised', 'front_hand'),
  // Admin hub
  users: icon('person.2', 'groups'),
  roles: icon('shield', 'shield'),
  permissions: icon('checkmark.shield', 'verified_user'),
  mail: icon('envelope', 'mail'),
  room: icon('door.left.hand.open', 'meeting_room'),
  frequency: icon('repeat', 'repeat'),
  equipment: icon('dot.radiowaves.left.and.right', 'sensors'),
} as const;

export type IconName = keyof typeof icons;

/**
 * An icon in one of the palette colours. Decorative by default (hidden from screen readers, because the words next
 * to it carry the meaning); pass `label` when the icon stands alone, for example an icon-only button.
 */
export function Icon({ name, size = 24, color = 'content', label }: { name: IconName; size?: number; color?: ColorToken; label?: string }) {
  return (
    <SymbolView
      name={icons[name]}
      size={size}
      tintColor={colors[color]}
      accessible={Boolean(label)}
      accessibilityLabel={label}
      accessibilityRole={label ? 'image' : undefined}
      aria-hidden={label ? undefined : true}
    />
  );
}
