// The package's main entry pulls in Node-only code; its pure core module is what a phone can use.
declare module 'qrcode/lib/core/qrcode' {
  export function create(
    text: string,
    options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' },
  ): { version: number; modules: { size: number; get(row: number, col: number): number } };
}
