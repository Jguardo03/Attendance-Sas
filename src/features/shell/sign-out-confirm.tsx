import { Button, Card, Text } from '@/components/ui';
import { useAuth } from '@/providers/auth';

// "Sign out?" with its two buttons: used by the Profile screen and the sidebar, so signing out always asks first.
export function SignOutConfirm({ onCancel }: { onCancel: () => void }) {
  const { signOut } = useAuth();
  return (
    <Card title="Sign out?">
      <Text variant="meta">You will need a new sign-in code to get back in.</Text>
      <Button variant="danger" label="Sign out" onPress={signOut} />
      <Button variant="secondary" label="Cancel" onPress={onCancel} />
    </Card>
  );
}
