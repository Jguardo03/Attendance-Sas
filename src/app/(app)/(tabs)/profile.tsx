import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Screen, Text } from '@/components/ui';
import { SignOutConfirm } from '@/features/shell/sign-out-confirm';
import { useMyProfile } from '@/features/shell/use-my-profile';
import { useAuth } from '@/providers/auth';

export default function ProfileScreen() {
  const { claims } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const profile = useMyProfile();

  return (
    <Screen title="Profile">
      <Card title="Personal info">
        {profile.isPending ? <Text variant="muted">Loading...</Text> : null}
        {profile.isError ? <Text variant="error">Could not load your profile.</Text> : null}
        {profile.data ? (
          <View className="gap-1">
            <Text>
              {profile.data.first_name} {profile.data.last_name}
            </Text>
            <Text variant="muted">{profile.data.email}</Text>
            <Text variant="muted">ID: {profile.data.id}</Text>
          </View>
        ) : null}
        {claims?.role ? <Badge label={`Role: ${claims.role}`} /> : null}
      </Card>

      {confirming ? <SignOutConfirm onCancel={() => setConfirming(false)} /> : <Button variant="secondary" label="Sign out" onPress={() => setConfirming(true)} />}
      {__DEV__ ? <Button variant="secondary" label="Dev: UI gallery" onPress={() => router.push('/dev/ui')} /> : null}
    </Screen>
  );
}
