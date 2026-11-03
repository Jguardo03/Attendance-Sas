import { fireEvent, render, screen } from '@testing-library/react-native';

import { Banner, Collapsible, Loading, SegmentedTabs } from '@/components/ui';
import { StepButton } from '@/features/sessions/week-calendar';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('Loading', () => {
  it('shows the words and announces them as a progress bar', async () => {
    await render(<Loading />);
    expect(screen.getByText('Loading...')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Loading...' })).toBeTruthy();
  });

  it('takes its own words', async () => {
    await render(<Loading label="Checking locations..." />);
    expect(screen.getByRole('progressbar', { name: 'Checking locations...' })).toBeTruthy();
  });
});

describe('icon-only controls have names', () => {
  it('names the week step buttons', async () => {
    const onPress = jest.fn();
    await render(<StepButton icon="chevronLeft" label="Previous week" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Previous week' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('names the banner dismiss button', async () => {
    await render(<Banner tone="info" message="Note" onDismiss={() => {}} />);
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeTruthy();
  });
});

describe('keyboard and screen reader state', () => {
  it('tabs and the collapsible say which one is chosen or open', async () => {
    await render(
      <>
        <SegmentedTabs label="Show" value="a" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} onChange={() => {}} />
        <Collapsible title="Filters" />
      </>,
    );
    expect(screen.getByRole('tab', { name: 'A' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('tab', { name: 'B' }).props.accessibilityState.selected).toBe(false);
    const filters = screen.getByRole('button', { name: 'Filters' });
    expect(filters.props.accessibilityState.expanded).toBe(false);
    await fireEvent.press(filters);
    expect(screen.getByRole('button', { name: 'Filters' }).props.accessibilityState.expanded).toBe(true);
  });
});
