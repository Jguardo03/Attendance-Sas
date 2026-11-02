import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Linking, Platform, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';

// Camera with a QR scanner, and the permission step in front of it. `onCode` fires for each code seen; the caller
// decides what to do with it (a throttle here stops one steady code from firing many times a second).
export function QrScanner({ onCode, paused }: { onCode: (data: string) => void; paused: boolean }) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastScan = useRef(0);

  if (!permission) return <Text variant="muted">Checking camera access...</Text>;

  if (!permission.granted) {
    return (
      <Card title="Camera access">
        <Text variant="muted">The camera is used only to read the QR code shown in the room.</Text>
        {permission.canAskAgain ? (
          <Button label="Allow camera" onPress={() => requestPermission()} />
        ) : (
          <>
            <Text variant="error">Camera access is turned off for this app.</Text>
            {Platform.OS !== 'web' ? <Button label="Open settings" onPress={() => Linking.openSettings()} /> : null}
          </>
        )}
      </Card>
    );
  }

  return (
    <View className="overflow-hidden rounded-lg border border-border" style={{ height: 320 }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          paused
            ? undefined
            : ({ data }) => {
                const now = Date.now();
                if (now - lastScan.current < 1500) return;
                lastScan.current = now;
                onCode(data);
              }
        }
      />
    </View>
  );
}
