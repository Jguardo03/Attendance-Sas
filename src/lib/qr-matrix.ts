import { create } from 'qrcode/lib/core/qrcode';

/** The QR code for `text` as a grid of dark (true) and light (false) squares. Medium error correction. */
export function qrMatrix(text: string): boolean[][] {
  const { modules } = create(text, { errorCorrectionLevel: 'M' });
  return Array.from({ length: modules.size }, (_, row) => Array.from({ length: modules.size }, (_, col) => modules.get(row, col) === 1));
}

/**
 * An SVG path that draws every dark square, merging neighbours in a row into one rectangle so a code is a few
 * hundred path pieces, not a few thousand elements. Coordinates are in squares, offset by `margin` for the quiet zone.
 */
export function qrPath(matrix: boolean[][], margin = 4): string {
  const parts: string[] = [];
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < row.length && row[end]) end += 1;
      parts.push(`M${x + margin} ${y + margin}h${end - x}v1h-${end - x}z`);
      x = end;
    }
  });
  return parts.join('');
}
