import { CameraView } from 'expo-camera';

// The ways a student can prove they are in the room, tried in this order: Bluetooth beacon, NFC tag, QR code.
// Only the QR method exists so far. The other two report "not available" so the dialog already behaves the way it
// will once they are built, and the student is taken straight to the QR code.
export type MethodId = 'beacon' | 'nfc' | 'qr';

export interface CheckInMethod {
  id: MethodId;
  label: string;
  isAvailable(): Promise<boolean>;
}

export const methods: CheckInMethod[] = [
  { id: 'beacon', label: 'Bluetooth beacon', isAvailable: async () => false }, // built in a later phase
  { id: 'nfc', label: 'NFC tag', isAvailable: async () => false }, // built in a later phase
  {
    id: 'qr',
    label: 'QR code',
    isAvailable: async () => {
      try {
        return await CameraView.isAvailableAsync();
      } catch {
        return false;
      }
    },
  },
];

export type PlannedMethod = { id: MethodId; label: string; available: boolean };

export async function planMethods(list: CheckInMethod[] = methods): Promise<PlannedMethod[]> {
  return Promise.all(list.map(async (method) => ({ id: method.id, label: method.label, available: await method.isAvailable() })));
}

/** The first method that can be used, in order. */
export function firstAvailable(plan: PlannedMethod[]): MethodId | null {
  return plan.find((method) => method.available)?.id ?? null;
}

/** The status word beside each method in the dialog (check in dialog wireframes). */
export function methodStatus(plan: PlannedMethod[], method: PlannedMethod): string {
  if (!method.available) return 'Not available on this device';
  const active = firstAvailable(plan);
  if (method.id === active) return 'Scanning';
  const later = plan.findIndex((item) => item.id === method.id) > plan.findIndex((item) => item.id === active);
  return later ? 'Next if needed' : 'Skipped';
}
