import { View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useDevicePermissionsPrompt } from '@/lib/device-permissions';

// "Set up check-in" (Student UI page 8). Information only for now. The Bluetooth, NFC and camera requests are added
// with each check-in method (Phases 8, 11 and 12), when there is a real feature to ask for.
const reasons: { icon: IconName; title: string; text: string }[] = [
  { icon: 'bluetooth', title: 'Bluetooth', text: 'Detects the classroom beacon so you can check in when you are in the room.' },
  { icon: 'nfc', title: 'NFC', text: 'Lets you tap your phone on the classroom tag to check in.' },
  { icon: 'qrScan', title: 'Camera', text: 'Scans the QR code shown in class.' },
];

export default function DevicePermissionsScreen() {
  const { markSeen } = useDevicePermissionsPrompt();

  return (
    <Screen standalone title="Set up check-in">
      <Text variant="meta">Your phone checks you in using what is in the room. Here is what each part is for.</Text>
      <Card>
        {reasons.map((reason, index) => (
          <View key={reason.title} className={`flex-row items-start gap-3 py-2 ${index < reasons.length - 1 ? 'border-b border-border' : ''}`}>
            <View className="h-10 w-10 items-center justify-center rounded-block bg-primary-tint">
              <Icon name={reason.icon} size={20} color="primary" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text variant="card">{reason.title}</Text>
              <Text variant="meta">{reason.text}</Text>
            </View>
          </View>
        ))}
      </Card>
      <Text variant="meta">Your phone will ask for each permission the first time you use that method.</Text>
      <Button size="large" label="Continue" onPress={markSeen} />
    </Screen>
  );
}
