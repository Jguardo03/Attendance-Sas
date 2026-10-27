import { Button, Card, Screen, Text } from '@/components/ui';
import { useDevicePermissionsPrompt } from '@/lib/device-permissions';

// Information only for now. The Bluetooth, NFC and camera requests are added with each check-in
// method (Phases 8, 11 and 12), when there is a real feature to ask for.
export default function DevicePermissionsScreen() {
  const { markSeen } = useDevicePermissionsPrompt();

  return (
    <Screen title="Allow check-in on this device">
      <Card title="Bluetooth">
        <Text variant="muted">Detects the classroom beacon so you can check in when you are in the room.</Text>
      </Card>
      <Card title="NFC">
        <Text variant="muted">Lets you tap your phone on the classroom tag to check in.</Text>
      </Card>
      <Card title="Camera">
        <Text variant="muted">Scans the QR code shown in class.</Text>
      </Card>
      <Text variant="muted">Your phone will ask for each permission the first time you use that method.</Text>
      <Button label="Continue" onPress={markSeen} />
    </Screen>
  );
}
