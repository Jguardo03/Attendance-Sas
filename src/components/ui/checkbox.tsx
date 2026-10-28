import { Pressable, View } from 'react-native';

import { Text } from './text';

// The box shows a check mark character, so state never relies on color alone.
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
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: partial ? 'mixed' : checked }}
      onPress={onChange}
      className="flex-row items-center gap-3 py-1">
      <View className={`h-6 w-6 items-center justify-center rounded border ${checked || partial ? 'border-primary bg-primary' : 'border-border bg-surface'}`}>
        <Text className="text-primary-content">{partial ? '-' : checked ? '✓' : ''}</Text>
      </View>
      <Text className="flex-1">{label}</Text>
    </Pressable>
  );
}
