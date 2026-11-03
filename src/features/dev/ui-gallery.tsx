import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppMark } from '@/components/app-mark';
import { Avatar } from '@/components/avatar';
import { BreakdownRing, ProgressBar, ProgressRing } from '@/components/charts';
import { ARTWORK_COUNT, ClassArtwork, artworkIndex } from '@/components/class-artwork';
import { Icon, icons, type IconName } from '@/components/icon';
import { Button, Card, Screen, Text } from '@/components/ui';
import { colors, typeScale, type ColorToken } from '@/theme/tokens';

// Development only (the route is registered only when __DEV__): every visual building block in one place, so a
// change to a token or a component can be checked on web and on a phone in a minute. Opened from Profile.
const swatches = Object.entries(colors) as [ColorToken, string][];
const iconNames = Object.keys(icons) as IconName[];
const people = [
  ['Sara Ali', 'S1000008'],
  ['Noah Brown', 'S1000004'],
  ['Ana Costa', 'S1000006'],
  ['Jack Smith', 'S1000007'],
  ['Yuki Tanaka', 'S1000005'],
  ['Ethan Wong', 'S1000009'],
] as const;

export function UiGallery() {
  const router = useRouter();
  return (
    <Screen standalone title="UI gallery">
      <Button variant="secondary" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />

      <Card title="Colours">
        <View className="flex-row flex-wrap gap-3">
          {swatches.map(([name, hex]) => (
            <View key={name} className="w-[30%] min-w-[88px] gap-1" accessibilityLabel={`${name} ${hex}`}>
              <View className="h-10 rounded-block border border-border" style={{ backgroundColor: hex }} />
              <Text variant="muted" style={{ fontSize: 11 }}>
                {name}
              </Text>
              <Text variant="muted" style={{ fontSize: 11 }}>
                {hex}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card title="Type scale (Inter)">
        <Text className="font-inter-bold text-title text-content">Title 24 / Bold</Text>
        <Text className="font-inter-bold text-section text-content">Section 17 / Bold</Text>
        <Text className="font-inter-semibold text-card text-content">Card 15 / Semibold</Text>
        <Text className="font-inter text-body text-content">Body 14 / Regular</Text>
        <Text className="font-inter text-meta text-content-muted">Meta 13 / Regular</Text>
        <Text className="font-inter-semibold text-label uppercase text-content-muted">Label 12 / Semibold</Text>
        <Text variant="muted">{Object.keys(typeScale).join(', ')}</Text>
      </Card>

      <Card title={`Icons (${iconNames.length})`}>
        <View className="flex-row flex-wrap gap-3">
          {iconNames.map((name) => (
            <View key={name} className="w-[22%] min-w-[72px] items-center gap-1">
              <Icon name={name} size={24} color="primary" />
              <Text variant="muted" style={{ fontSize: 10 }}>
                {name}
              </Text>
            </View>
          ))}
        </View>
        <View className="flex-row items-center gap-3">
          <Icon name="check" size={16} color="success" />
          <Icon name="warning" size={20} color="warning" />
          <Icon name="close" size={24} color="danger" />
          <Icon name="bell" size={32} color="content" label="Notifications" />
          <Text variant="muted">sizes 16 to 32, tinted from tokens</Text>
        </View>
      </Card>

      <Card title="App mark">
        <View className="flex-row items-center gap-4">
          <AppMark size={32} />
          <AppMark size={48} />
          <AppMark size={72} />
          <View className="rounded-block bg-primary-dark p-2">
            <AppMark size={48} variant="plain" />
          </View>
          <AppMark size={48} variant="brand" />
        </View>
      </Card>

      <Card title="Class artwork">
        <View className="flex-row flex-wrap gap-3">
          {Array.from({ length: ARTWORK_COUNT }, (_, index) => (
            <View key={index} className="w-[46%] gap-1">
              <View className="aspect-[16/9] overflow-hidden rounded-block">
                <ClassArtwork classId={index} />
              </View>
              <Text variant="muted">Pattern {index + 1} (class ids {index}, {index + ARTWORK_COUNT}, ...)</Text>
            </View>
          ))}
        </View>
        <Text variant="muted">Class 42 gets pattern {artworkIndex(42) + 1}, always.</Text>
        <View className="h-16 w-40 overflow-hidden rounded-block">
          <ClassArtwork classId={5} />
        </View>
        <Text variant="muted">Cropped, not stretched, in a 160 x 64 box.</Text>
      </Card>

      <Card title="Rings and bars">
        <View className="flex-row flex-wrap items-center gap-4">
          <ProgressRing value={92} />
          <ProgressRing value={85} />
          <ProgressRing value={75} />
          <ProgressRing value={64} />
          <ProgressRing value={100} />
          <ProgressRing value={null} />
          <ProgressRing value={89} size={96} strokeWidth={10} />
        </View>
        <View className="flex-row flex-wrap items-center gap-4">
          <BreakdownRing present={22} late={3} absent={3} />
          <BreakdownRing present={0} late={0} absent={0} />
        </View>
        <View className="gap-3">
          <View className="gap-1">
            <Text variant="muted">18/24</Text>
            <ProgressBar value={18} max={24} label="18 of 24" />
          </View>
          <View className="gap-1">
            <Text variant="muted">9/18 (warning)</Text>
            <ProgressBar value={9} max={18} tone="warning" label="9 of 18" />
          </View>
          <View className="gap-1">
            <Text variant="muted">0/22</Text>
            <ProgressBar value={0} max={22} label="0 of 22" />
          </View>
        </View>
      </Card>

      <Card title="Avatars">
        <View className="flex-row flex-wrap items-center gap-3">
          {people.map(([name, id]) => (
            <Avatar key={id} name={name} id={id} />
          ))}
          <Avatar name="Madonna" size={56} />
        </View>
      </Card>
    </Screen>
  );
}
