import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Screen, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';

export default function ProfileScreen() {
  const { claims, signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const appUserId = claims?.appUserId;

  const profile = useQuery({
    queryKey: ['profile', appUserId],
    enabled: Boolean(supabase && appUserId),
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', appUserId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

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

      {confirming ? (
        <Card title="Sign out?">
          <Text variant="muted">You will need a new sign-in link to get back in.</Text>
          <Button variant="danger" label="Sign out" onPress={signOut} />
          <Button variant="secondary" label="Cancel" onPress={() => setConfirming(false)} />
        </Card>
      ) : (
        <Button variant="secondary" label="Sign out" onPress={() => setConfirming(true)} />
      )}
    </Screen>
  );
}
