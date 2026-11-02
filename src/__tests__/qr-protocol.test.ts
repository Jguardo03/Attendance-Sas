import { computeMac, formatPayload, parsePayload, secondsLeft, stepAccepted, stepAt } from '@/lib/qr-protocol';

// Seed bytes 0 to 31. The expected values were made once with Node's own HMAC
// (createHmac('sha256', seed).update('<location>.<step>')), not with the code under test.
const seed = Uint8Array.from({ length: 32 }, (_, index) => index);

describe('QR code protocol', () => {
  it('makes the same MAC as an independent HMAC-SHA256, first 16 hex characters', async () => {
    expect(await computeMac(seed, 1, 59319220)).toBe('0638ac03850215cc');
    expect(await computeMac(seed, 1, 59319221)).toBe('bcaafc2abd4fe7ce');
    expect(await computeMac(seed, 2, 59319220)).toBe('cab77f2adaeda450');
  });

  it('gives a different MAC for another step, another room or another seed', async () => {
    const base = await computeMac(seed, 1, 59319220);
    expect(await computeMac(seed, 1, 59319221)).not.toBe(base);
    expect(await computeMac(seed, 2, 59319220)).not.toBe(base);
    expect(await computeMac(Uint8Array.from(seed, (b) => b ^ 1), 1, 59319220)).not.toBe(base);
  });

  it('a code made without the seed does not verify', async () => {
    const forged = formatPayload({ locationId: 1, step: 59319220, mac: '0000000000000000' });
    const parsed = parsePayload(forged)!;
    expect(parsed.mac).not.toBe(await computeMac(seed, parsed.locationId, parsed.step));
  });

  it('formats and parses the v1 shape, and rejects anything else', () => {
    const text = formatPayload({ locationId: 3, step: 59319220, mac: '0638ac03850215cc' });
    expect(text).toBe('v1.3.59319220.0638ac03850215cc');
    expect(parsePayload(` ${text}\n`)).toEqual({ locationId: 3, step: 59319220, mac: '0638ac03850215cc' });
    for (const bad of ['', 'hello', 'v2.3.59319220.0638ac03850215cc', 'v1.3.59319220.0638AC03850215CC', 'v1.3.59319220.0638ac03', 'v1.x.5.0638ac03850215cc', 'https://example.com']) {
      expect(parsePayload(bad)).toBeNull();
    }
  });

  it('changes every 30 seconds and accepts the current step and one either side', () => {
    expect(stepAt(0)).toBe(0);
    expect(stepAt(29.9)).toBe(0);
    expect(stepAt(30)).toBe(1);
    const now = 59319220 * 30 + 5;
    expect(stepAccepted(59319220, now)).toBe(true);
    expect(stepAccepted(59319219, now)).toBe(true);
    expect(stepAccepted(59319221, now)).toBe(true);
    expect(stepAccepted(59319218, now)).toBe(false);
    expect(stepAccepted(59319222, now)).toBe(false);
  });

  it('counts down the seconds left in the current code', () => {
    expect(secondsLeft(60)).toBe(30);
    expect(secondsLeft(61)).toBe(29);
    expect(secondsLeft(89)).toBe(1);
  });
});
