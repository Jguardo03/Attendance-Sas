import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';

import { colors, radii, shadows } from '@/theme/tokens';

import { Text } from './text';

// White card, radius 20, soft shadow (Student UI style sheet).
//  - default: the normal card.
//  - flat: a smaller block inside a card (radius 14, a hairline instead of a shadow).
//  - hero: the blue gradient banner at the top of a screen (Live now, class attendance); put white text in it.
type Variant = 'default' | 'flat' | 'hero';

// A hero card on banner artwork. The artwork has its circles on the right, so on a card narrower than the picture (a phone)
// it is sized to the card's height and pinned right instead of being cropped to the middle. Not ImageBackground: on web
// the picture keeps its own pixel size there instead of filling the card. The colour shows while it loads.
function BannerCard({ image, title, children }: { image: ImageSourcePropType; title?: string; children?: ReactNode }) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const size = Image.resolveAssetSource(image);
  const ratio = size?.width && size.height ? size.width / size.height : 4;
  const narrow = box.height > 0 && box.width / box.height < ratio;

  return (
    <View
      onLayout={(event) => setBox(event.nativeEvent.layout)}
      style={{ borderRadius: radii.card, padding: 20, gap: 8, overflow: 'hidden', backgroundColor: colors.primary }}>
      <Image
        source={image}
        resizeMode="cover"
        aria-hidden
        style={narrow ? { position: 'absolute', top: 0, right: 0, height: box.height, width: box.height * ratio } : { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      {title ? <Text variant="card" className="text-primary-content">{title}</Text> : null}
      {children}
    </View>
  );
}

export function Card({ title, variant = 'default', image, children }: { title?: string; variant?: Variant; image?: ImageSourcePropType; children?: ReactNode }) {
  if (variant === 'hero' && image) return <BannerCard image={image} title={title}>{children}</BannerCard>;
  if (variant === 'hero') {
    return (
      <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radii.card, padding: 20, gap: 8 }}>
        {title ? <Text variant="card" className="text-primary-content">{title}</Text> : null}
        {children}
      </LinearGradient>
    );
  }
  if (variant === 'flat') {
    return (
      <View className="gap-2 rounded-block border border-border bg-surface p-3">
        {title ? <Text variant="card">{title}</Text> : null}
        {children}
      </View>
    );
  }
  return (
    <View className="gap-2 rounded-card bg-surface p-4" style={{ boxShadow: shadows.card }}>
      {title ? <Text variant="card">{title}</Text> : null}
      {children}
    </View>
  );
}
