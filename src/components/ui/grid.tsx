import { Children, type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';

/** How many cards fit side by side: one on a phone or a narrow window, two from 1280 px, three from 1800 px. */
export function useColumns() {
  const { width } = useWindowDimensions();
  return width >= 1800 ? 3 : width >= 1280 ? 2 : 1;
}

// A row of cards that wraps: each card is at least 240 px wide, so a phone gets one per line and a desktop column gets as
// many as fit side by side (up to 384 px each, so a lone card does not stretch across the whole column).
export function CardRow({ children }: { children?: ReactNode }) {
  return (
    <View className="flex-row flex-wrap items-start gap-4">
      {Children.toArray(children).map((card, index) => (
        <View key={index} className="min-w-[240px] flex-1 basis-[240px] md:max-w-sm">
          {card}
        </View>
      ))}
    </View>
  );
}

// Lays cards out in columns that fill the row, left to right then down (card 1, 2, 3 across). One column is a plain stack.
export function Grid({ columns, children }: { columns?: number; children?: ReactNode }) {
  const automatic = useColumns();
  const count = columns ?? automatic;
  const cards = Children.toArray(children);
  if (count <= 1) return <View className="gap-3">{cards}</View>;

  return (
    <View className="flex-row items-start gap-4">
      {Array.from({ length: count }, (_, column) => (
        <View key={column} className="flex-1 gap-3">
          {cards.filter((_card, index) => index % count === column)}
        </View>
      ))}
    </View>
  );
}
