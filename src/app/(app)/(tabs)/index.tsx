import { ConnectionStatus } from '@/components/connection-status';
import { Card, Screen, Text } from '@/components/ui';

export default function HomeScreen() {
  return (
    <Screen title="Home">
      <ConnectionStatus />
      <Card title="Today sessions">
        <Text variant="muted">Placeholder. Built in Phase 7 from the Home wireframes.</Text>
      </Card>
    </Screen>
  );
}
