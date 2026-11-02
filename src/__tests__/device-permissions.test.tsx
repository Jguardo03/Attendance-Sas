import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { useDevicePermissionsPrompt } from '@/lib/device-permissions';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/providers/auth', () => ({
  useAuth: () => ({ claims: { appUserId: 'S1000001' }, can: () => true }),
}));

// Stands in for the route layout (reads "pending") and the permissions screen (calls markSeen).
function Layout() {
  const { loading, pending } = useDevicePermissionsPrompt();
  return <Text>{loading ? 'loading' : pending ? 'pending' : 'through'}</Text>;
}

function Screen() {
  const { markSeen } = useDevicePermissionsPrompt();
  return (
    <Pressable onPress={markSeen}>
      <Text>Continue</Text>
    </Pressable>
  );
}

describe('device permissions prompt', () => {
  it('lets the layout through after Continue is pressed on the screen', async () => {
    await render(
      <>
        <Layout />
        <Screen />
      </>,
    );
    expect(await screen.findByText('pending')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continue'));
    expect(await screen.findByText('through')).toBeTruthy();
  });
});
