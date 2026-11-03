import { View, type ViewProps } from 'react-native';

// expo-linear-gradient draws a native view. In tests it is a plain view that keeps its props (colors, start, end).
export function LinearGradient(props: ViewProps & { colors?: readonly unknown[] }) {
  return <View testID="linear-gradient" {...props} />;
}
