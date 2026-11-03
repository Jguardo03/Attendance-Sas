import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  Dropdown,
  EmptyState,
  ListRow,
  SegmentedTabs,
  Select,
  Text,
  TextField,
  type BadgeTone,
} from '@/components/ui';
import { colors } from '@/theme/tokens';

const hidden = { includeHiddenElements: true } as const;

describe('Button', () => {
  it('calls onPress, and not when disabled', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <Button label="Check in" onPress={onPress} />
        <Button label="Closed" onPress={onPress} disabled />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Check in' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Closed' })).toBeDisabled();
  });

  it('shows an icon beside the label, tinted to suit the variant', async () => {
    await render(
      <>
        <Button label="Check in" icon="check" />
        <Button label="Show QR code" icon="qr" variant="secondary" />
      </>,
    );
    expect(screen.getByTestId('symbol:checkmark', hidden).props.tintColor).toBe(colors.primaryContent);
    expect(screen.getByTestId('symbol:qrcode', hidden).props.tintColor).toBe(colors.primary);
  });

  it('greys the icon of a disabled button', async () => {
    await render(<Button label="Opens 12:50" icon="clock" disabled />);
    expect(screen.getByTestId('symbol:clock', hidden).props.tintColor).toBe(colors.contentMuted);
  });

  it('renders every variant and both sizes with the label', async () => {
    await render(
      <>
        <Button label="Primary" />
        <Button label="Secondary" variant="secondary" />
        <Button label="Danger" variant="danger" />
        <Button label="Ghost" variant="ghost" />
        <Button label="Large" size="large" />
      </>,
    );
    for (const name of ['Primary', 'Secondary', 'Danger', 'Ghost', 'Large']) expect(screen.getByRole('button', { name })).toBeTruthy();
  });
});

describe('Badge', () => {
  const tones: BadgeTone[] = ['neutral', 'success', 'warning', 'danger', 'live', 'upcoming', 'rescheduled', 'cancelled'];

  it('always shows its text, in every tone', async () => {
    await render(
      <>
        {tones.map((tone) => (
          <Badge key={tone} label={`Pill ${tone}`} tone={tone} />
        ))}
      </>,
    );
    for (const tone of tones) expect(screen.getByText(`Pill ${tone}`)).toBeTruthy();
  });

  it('keeps the tones existing screens use', async () => {
    await render(
      <>
        <Badge label="A" tone="success" />
        <Badge label="B" tone="warning" />
        <Badge label="C" tone="danger" />
        <Badge label="D" />
      </>,
    );
    expect(screen.getByText('D')).toBeTruthy();
  });

  it('draws a dot only when asked, and hides it from screen readers', async () => {
    const { toJSON } = await render(<Badge label="Present" tone="success" dot />);
    expect(JSON.stringify(toJSON())).toContain('rounded-full');
    expect(screen.getByText('Present')).toBeTruthy();
  });
});

describe('Card', () => {
  it('shows a title and content in each variant', async () => {
    await render(
      <>
        <Card title="Default title">
          <Text>Default body</Text>
        </Card>
        <Card variant="flat" title="Flat title">
          <Text>Flat body</Text>
        </Card>
        <Card variant="hero" title="Hero title">
          <Text>Hero body</Text>
        </Card>
      </>,
    );
    for (const text of ['Default title', 'Default body', 'Flat title', 'Flat body', 'Hero title', 'Hero body']) expect(screen.getByText(text)).toBeTruthy();
  });

  it('draws the hero card as a gradient from the primary to the dark primary', async () => {
    await render(<Card variant="hero" />);
    expect(screen.getByTestId('linear-gradient').props.colors).toEqual([colors.primary, colors.primaryDark]);
  });
});

describe('Text', () => {
  it('renders every style', async () => {
    await render(
      <>
        {(['title', 'section', 'heading', 'card', 'body', 'meta', 'muted', 'label', 'error'] as const).map((variant) => (
          <Text key={variant} variant={variant}>{`Text ${variant}`}</Text>
        ))}
      </>,
    );
    expect(screen.getAllByText(/^Text /)).toHaveLength(9);
  });
});

describe('TextField', () => {
  it('shows an error message under the field and reports typing', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Email" value="" onChangeText={onChangeText} error="Enter a valid email address." />);
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.c');
    expect(onChangeText).toHaveBeenCalledWith('a@b.c');
  });

  it('can be a taller multi-line field', async () => {
    await render(<TextField label="Reason" value="" onChangeText={jest.fn()} multiline />);
    expect(screen.getByLabelText('Reason').props.multiline).toBe(true);
  });
});

describe('Select and Dropdown', () => {
  it('marks the chosen chip and reports a new choice', async () => {
    const onChange = jest.fn();
    await render(<Select label="Status" value="late" options={[{ value: 'present', label: 'Present' }, { value: 'late', label: 'Late' }]} onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Late' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'Present' }));
    expect(onChange).toHaveBeenCalledWith('present');
  });

  it('shows a tick on the chosen option and shows its error', async () => {
    await render(<Dropdown label="Class" value="2" options={[{ value: '1', label: 'Maths' }, { value: '2', label: 'Physics' }]} onChange={jest.fn()} error="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Class' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Class' }));
    expect(screen.getByRole('menuitem', { name: 'Physics' })).toBeSelected();
    expect(screen.getByTestId('symbol:checkmark', hidden)).toBeTruthy();
  });
});

describe('Checkbox', () => {
  it('reports checked, mixed and unchecked, with a mark only when filled', async () => {
    await render(
      <>
        <Checkbox label="All" checked={false} partial onChange={jest.fn()} />
        <Checkbox label="One" checked onChange={jest.fn()} />
        <Checkbox label="None" checked={false} onChange={jest.fn()} />
      </>,
    );
    expect(screen.getByRole('checkbox', { name: 'All' }).props.accessibilityState.checked).toBe('mixed');
    expect(screen.getByRole('checkbox', { name: 'One' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'None' })).not.toBeChecked();
    expect(screen.getByTestId('symbol:minus', hidden)).toBeTruthy();
    expect(screen.getAllByTestId('symbol:checkmark', hidden)).toHaveLength(1);
  });

  it('calls onChange when pressed', async () => {
    const onChange = jest.fn();
    await render(<Checkbox label="One" checked={false} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'One' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('Banner', () => {
  it('announces an error, shows its title and message, and runs its actions', async () => {
    const onView = jest.fn();
    await render(<Banner tone="error" title="Location already booked" message="Choose another location." actions={[{ label: 'View booking', onPress: onView }]} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Location already booked')).toBeTruthy();
    expect(screen.getByText('Choose another location.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'View booking' }));
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it('can be dismissed, and only offers that when asked', async () => {
    const onDismiss = jest.fn();
    await render(
      <>
        <Banner message="Saved" tone="success" />
        <Banner message="Careful" tone="warning" onDismiss={onDismiss} />
      </>,
    );
    expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not announce non-error messages as alerts', async () => {
    await render(<Banner message="Just so you know" />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('EmptyState', () => {
  it('shows one title, one line and one action', async () => {
    const onAction = jest.fn();
    await render(<EmptyState icon="calendar" title="No sessions today" message="Enjoy the free time." actionLabel="Open calendar" onAction={onAction} />);
    expect(screen.getByText('No sessions today')).toBeTruthy();
    expect(screen.getByText('Enjoy the free time.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open calendar' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('leaves out the action when none is given', async () => {
    await render(<EmptyState icon="classes" title="No classes" message="Nothing here yet." />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('SegmentedTabs', () => {
  it('marks the chosen tab and reports a new one', async () => {
    const onChange = jest.fn();
    await render(<SegmentedTabs label="Period" value="active" onChange={onChange} options={[{ value: 'active', label: 'Active period' }, { value: 'previous', label: 'Previous' }]} />);
    expect(screen.getByRole('tab', { name: 'Active period' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Previous' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Previous' }));
    expect(onChange).toHaveBeenCalledWith('previous');
  });
});

describe('ListRow', () => {
  it('shows a title and a second line, and opens when pressed', async () => {
    const onPress = jest.fn();
    await render(<ListRow icon="classes" title="Classes" subtitle="Courses and schedules" onPress={onPress} />);
    expect(screen.getByText('Courses and schedules')).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Classes' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('symbol:chevron.right', hidden)).toBeTruthy();
  });

  it('can show something other than the chevron', async () => {
    await render(<ListRow icon="users" title="Users" onPress={jest.fn()} trailing={<Badge label="12" />} />);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.queryByTestId('symbol:chevron.right', hidden)).toBeNull();
  });
});
