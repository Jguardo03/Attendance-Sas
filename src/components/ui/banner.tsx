import { Pressable, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import type { ColorToken } from '@/theme/tokens';

import { Button } from './button';
import { Text } from './text';

// An inline message with an icon: an error ("Location already booked"), a warning, a note or a success. Errors are
// announced to screen readers as they appear. Class names are written out in full so the styling tool can see them.
const tones = {
  error: { box: 'bg-danger-tint', text: 'text-danger-strong', icon: 'error', color: 'dangerStrong' },
  warning: { box: 'bg-warning-tint', text: 'text-warning-content', icon: 'warning', color: 'warningContent' },
  info: { box: 'bg-primary-tint', text: 'text-primary', icon: 'info', color: 'primary' },
  success: { box: 'bg-success-tint', text: 'text-success-strong', icon: 'checkCircle', color: 'successStrong' },
} as const satisfies Record<string, { box: string; text: string; icon: IconName; color: ColorToken }>;

export type BannerTone = keyof typeof tones;
export type BannerAction = { label: string; onPress: () => void };

export function Banner({
  tone = 'info',
  title,
  message,
  actions,
  onDismiss,
}: {
  tone?: BannerTone;
  title?: string;
  message: string;
  actions?: BannerAction[];
  onDismiss?: () => void;
}) {
  const style = tones[tone];
  return (
    <View className={`gap-2 rounded-block p-3 ${style.box}`}>
      <View className="flex-row items-start gap-3">
        {/* An error is one announcement for screen readers; the buttons stay outside it so they remain reachable. */}
        <View
          className="flex-1 flex-row items-start gap-3"
          accessible={tone === 'error'}
          accessibilityRole={tone === 'error' ? 'alert' : undefined}
          accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}>
          <Icon name={style.icon} size={22} color={style.color} />
          <View className="flex-1 gap-0.5">
            {title ? <Text className={`font-inter-semibold ${style.text}`}>{title}</Text> : null}
            <Text className={style.text}>{message}</Text>
          </View>
        </View>
        {onDismiss ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={12}>
            <Icon name="close" size={20} color={style.color} />
          </Pressable>
        ) : null}
      </View>
      {actions && actions.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={action.label} variant="ghost" label={action.label} onPress={action.onPress} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
