import { View, type ViewProps } from 'react-native';

// expo-symbols draws native symbols (it needs a native view on iOS). In tests it is a plain view that keeps its props,
// so a test can read the symbol names and the tint a component asked for. Loaded by jest.setup.ts.
export function SymbolView(props: ViewProps & { name?: { ios?: string } | string }) {
  const ios = typeof props.name === 'object' ? props.name.ios : props.name;
  return <View testID={`symbol:${ios}`} {...props} />;
}
