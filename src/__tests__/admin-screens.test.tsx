import { fireEvent, render, screen } from '@testing-library/react-native';

import { CrudError } from '@/features/admin/components/crud-error';
import type { Session } from '@/features/sessions/format';
import { filterSessions } from '@/features/sessions/teaching';
import { SessionFilters } from '@/features/teaching/session-filters';

const session = (id: number, class_name: string, status = 'started') =>
  ({ session_id: id, class_name, status, lecturer_first_name: 'Omar', lecturer_last_name: 'Park', location_name: 'Room 1', lecturer_id: 'L1' }) as unknown as Session;

describe('CrudError', () => {
  const error = {
    title: 'Location already booked',
    message: 'Room 2.05 is booked for Database Systems on Wed 13:00.',
    conflict: 'Database Systems · Wed 13:00',
    action: 'view-booking' as const,
    actionLabel: 'View booking',
    fields: [],
  };

  it('shows the mapped title and message as an error alert, with the conflict and both actions', async () => {
    const onAction = jest.fn();
    const onDismiss = jest.fn();
    await render(<CrudError error={error as never} onAction={onAction} onDismiss={onDismiss} />);
    expect(screen.getByText('Location already booked')).toBeTruthy();
    expect(screen.getByText(/Room 2\.05 is booked for Database Systems on Wed 13:00\./)).toBeTruthy();
    expect(screen.getByText(/Conflicts with: Database Systems · Wed 13:00/)).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    await fireEvent.press(screen.getByText('View booking'));
    await fireEvent.press(screen.getByText('Dismiss'));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('admin session search and filter chips', () => {
  const list = [session(1, 'Database Systems'), session(2, 'Web Development', 'finished')];

  it('searches the class name, case-insensitively, together with the filters', () => {
    expect(filterSessions(list, {}, 'web').map((s) => s.session_id)).toEqual([2]);
    expect(filterSessions(list, { status: 'Live' }, 'web')).toHaveLength(0);
    expect(filterSessions(list, {}, '  ')).toHaveLength(2);
  });

  it('shows each filter that is on as a chip that removes just that filter', async () => {
    const onChange = jest.fn();
    await render(<SessionFilters sessions={list} value={{ lecturer: 'Omar Park', status: 'Live' }} onChange={onChange} search="" onSearch={jest.fn()} />);
    expect(screen.getByText('Lecturer: Omar Park')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Lecturer filter' }));
    expect(onChange).toHaveBeenCalledWith({ lecturer: undefined, status: 'Live' });
  });
});
