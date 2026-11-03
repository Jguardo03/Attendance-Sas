import { Image, View } from 'react-native';

import { Button } from './button';
import { Text } from './text';

const images = {
  calendar: require('../../../assets/images/Calendar empty state .png'),
  classes: require('../../../assets/images/Classes empty state.png'),
};

// What a list shows when it has nothing (Student UI style sheet): the illustration on the left, one short title, one
// helpful line and one action beside it.
export function EmptyState({
  image,
  title,
  message,
  actionLabel,
  onAction,
}: {
  image: keyof typeof images;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-row items-center gap-4 p-2">
      <Image source={images[image]} resizeMode="contain" style={{ width: 104, height: 92 }} aria-hidden />
      <View className="flex-1 items-start gap-1.5">
        <Text variant="section">{title}</Text>
        <Text variant="meta">{message}</Text>
        {actionLabel && onAction ? <Button variant="secondary" label={actionLabel} onPress={onAction} /> : null}
      </View>
    </View>
  );
}
