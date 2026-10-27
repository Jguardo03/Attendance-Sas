import { render, screen } from '@testing-library/react-native';

import { ConnectionStatus } from '@/components/connection-status';
import { QueryProvider } from '@/providers/query-provider';
import { Badge, Button, Card, Text } from '@/components/ui';

describe('UI primitives', () => {
  it('renders text, card, badge and a disabled button', async () => {
    await render(
      <Card title="Hello">
        <Text>Body</Text>
        <Badge label="Live" tone="success" />
        <Button label="Check in" disabled />
      </Card>,
    );
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeDisabled();
  });
});

describe('ConnectionStatus', () => {
  it('explains how to configure the backend when env vars are missing', async () => {
    await render(
      <QueryProvider>
        <ConnectionStatus />
      </QueryProvider>,
    );
    expect(screen.getByText('Not configured')).toBeTruthy();
  });
});
