import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { qrMatrix, qrPath } from '@/lib/qr-matrix';

const MARGIN = 4; // the quiet zone every scanner needs around a code, in squares

// Draws a QR code in black on white, whatever the theme: scanners need the contrast.
export function QrCode({ value, size = 320, label }: { value: string; size?: number; label?: string }) {
  const { path, squares } = useMemo(() => {
    const matrix = qrMatrix(value);
    return { path: qrPath(matrix, MARGIN), squares: matrix.length + MARGIN * 2 };
  }, [value]);

  return (
    <View accessibilityRole="image" accessibilityLabel={label ?? 'QR code'}>
      <Svg width={size} height={size} viewBox={`0 0 ${squares} ${squares}`}>
        <Rect width={squares} height={squares} fill="#ffffff" />
        <Path d={path} fill="#000000" />
      </Svg>
    </View>
  );
}
