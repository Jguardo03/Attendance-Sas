// The room QR code format (docs/check-in-protocol.md). The server makes and checks these codes; the app only
// needs to recognise one before sending it. The MAC code here is the reference the server functions repeat, kept so
// the rules can be tested with known values. The room secret never exists on a phone.

export const STEP_SECONDS = 30;

const PAYLOAD = /^v1\.(\d+)\.(\d+)\.([0-9a-f]{16})$/;

export type QrPayload = { locationId: number; step: number; mac: string };

export const stepAt = (unixSeconds: number): number => Math.floor(unixSeconds / STEP_SECONDS);

export function formatPayload({ locationId, step, mac }: QrPayload): string {
  return `v1.${locationId}.${step}.${mac}`;
}

/** Splits a scanned or typed code, or returns null when it is not shaped like a room code. */
export function parsePayload(text: string): QrPayload | null {
  const match = PAYLOAD.exec(text.trim());
  return match ? { locationId: Number(match[1]), step: Number(match[2]), mac: match[3] } : null;
}

/** The current step or the one either side is accepted, so a code stops working within 60 seconds of appearing. */
export function stepAccepted(step: number, nowSeconds: number): boolean {
  return Math.abs(step - stepAt(nowSeconds)) <= 1;
}

/** The first 16 hex characters of HMAC-SHA256(seed, "<locationId>.<step>"). */
export async function computeMac(seed: Uint8Array, locationId: number, step: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', seed as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${locationId}.${step}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/** Whole seconds left before the code changes. */
export const secondsLeft = (nowSeconds: number): number => STEP_SECONDS - (Math.floor(nowSeconds) % STEP_SECONDS);
