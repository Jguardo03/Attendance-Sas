import { View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Text } from '@/components/ui';
import { useAuth } from '@/providers/auth';

import { roleLabel } from './nav';
import { useMyProfile } from './use-my-profile';

// Initials, name and role of the signed-in person (top right on wide screens).
export function UserChip() {
  const { claims } = useAuth();
  const profile = useMyProfile();
  const name = profile.data ? `${profile.data.first_name} ${profile.data.last_name}` : '';
  const role = roleLabel(claims?.role);

  return (
    <View className="flex-row items-center gap-3" accessible accessibilityLabel={`${name || 'Signed in'}, ${role}`.trim()}>
      <Avatar name={name || role || '?'} id={claims?.appUserId ?? undefined} size={36} />
      <View>
        {name ? <Text variant="card">{name}</Text> : null}
        {role ? <Text variant="meta">{role}</Text> : null}
      </View>
    </View>
  );
}
