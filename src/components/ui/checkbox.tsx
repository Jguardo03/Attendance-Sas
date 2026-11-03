import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';

import { Text } from './text';

// The box shows a tick (or a dash when only some are chosen), so state never relies on colour alone.
export function Checkbox({
  label,
  checked,
  partial,
  onChange,
}: {
  label: string;
  checked: boolean;
  partial?: boolean;
  onChange: () => void;
}) {
  const filled = checked || partial;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: partial ? 'mixed' : checked }}
      onPress={onChange}
      className="min-h-11 flex-row items-center gap-3 py-1">
      <View className={`h-6 w-6 items-center justify-center rounded-md border ${filled ? 'border-primary bg-primary' : 'border-border bg-surface'}`}>
        {filled ? <Icon name={partial ? 'minus' : 'check'} size={16} color="primaryContent" /> : null}
      </View>
      <Text className="flex-1">{label}</Text>
    </Pressable>
  );
}
