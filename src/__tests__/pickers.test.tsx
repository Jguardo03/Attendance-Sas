import { fireEvent, render, screen } from '@testing-library/react-native';

import { Collapsible, DateField, Dropdown, Text, TimeField } from '@/components/ui';
import { findEntity } from '@/features/admin/entities';
import { initialValues, validateValues } from '@/features/admin/form';
import { addMonths, minuteOptions, monthGrid, parseIso, splitTime, toIso, weekdayIndex } from '@/lib/dates';

describe('date maths', () => {
  it('accepts only real calendar dates', () => {
    expect(parseIso('2027-02-10')).toEqual({ y: 2027, m: 2, d: 10 });
    expect(parseIso('2027-02-30')).toBeNull();
    expect(parseIso('2027-13-01')).toBeNull();
    expect(parseIso('1/2/2027')).toBeNull();
    expect(parseIso('')).toBeNull();
    expect(toIso({ y: 2027, m: 2, d: 3 })).toBe('2027-02-03');
  });

  it('knows 1 Feb 2027 is a Monday and lays out weeks starting on Monday', () => {
    expect(weekdayIndex(2027, 2, 1)).toBe(0);
    const weeks = monthGrid(2027, 2);
    expect(weeks).toHaveLength(4);
    expect(weeks[0][0]).toBe(1);
    expect(weeks[3][6]).toBe(28);
    // March 2027 starts on a Monday too; April 2027 starts on a Thursday, so three blanks come first.
    expect(monthGrid(2027, 4)[0].slice(0, 4)).toEqual([null, null, null, 1]);
  });

  it('moves across year boundaries', () => {
    expect(addMonths(2027, 12, 1)).toEqual({ y: 2028, m: 1 });
    expect(addMonths(2027, 1, -1)).toEqual({ y: 2026, m: 12 });
    expect(addMonths(2027, 5, -12)).toEqual({ y: 2026, m: 5 });
  });

  it('splits and offers 24 hour times, keeping a stored off-step minute', () => {
    expect(splitTime('09:30')).toEqual({ hour: '09', minute: '30' });
    expect(splitTime('24:00')).toEqual({ hour: '', minute: '' });
    expect(splitTime('')).toEqual({ hour: '', minute: '' });
    expect(minuteOptions(5)).toHaveLength(12);
    expect(minuteOptions(5, '07')).toContain('07');
  });
});

describe('Collapsible', () => {
  it('is closed by default and opens when the header is pressed', async () => {
    await render(
      <Collapsible title="Sessions (3)">
        <Text>Hidden content</Text>
      </Collapsible>,
    );
    expect(screen.queryByText('Hidden content')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Sessions (3)' }));
    expect(screen.getByText('Hidden content')).toBeTruthy();
  });
});

describe('Dropdown', () => {
  it('opens on press, reports the choice and closes', async () => {
    const onChange = jest.fn();
    await render(<Dropdown label="Class" value="" options={[{ value: '1', label: 'Maths' }, { value: '2', label: 'Physics' }]} onChange={onChange} />);
    expect(screen.queryByText('Physics')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Class' }));
    await fireEvent.press(screen.getByText('Physics'));
    expect(onChange).toHaveBeenCalledWith('2');
    expect(screen.queryByText('Maths')).toBeNull();
  });
});

describe('TimeField', () => {
  it('completes the time with :00 when only the hour is chosen', async () => {
    const onChange = jest.fn();
    await render(<TimeField label="Start time" value="" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start time hour' }));
    await fireEvent.press(screen.getByText('13'));
    expect(onChange).toHaveBeenCalledWith('13:00');
  });

  it('changes only the minutes and offers hours 00 to 23', async () => {
    const onChange = jest.fn();
    await render(<TimeField label="Start time" value="09:30" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start time minute' }));
    await fireEvent.press(screen.getByText('45'));
    expect(onChange).toHaveBeenCalledWith('09:45');
    await fireEvent.press(screen.getByRole('button', { name: 'Start time hour' }));
    expect(screen.getByText('23')).toBeTruthy();
    expect(screen.queryByText('24')).toBeNull();
  });
});

describe('DateField', () => {
  it('opens a calendar on the anchor month and returns the chosen date as ISO text', async () => {
    const onChange = jest.fn();
    await render(<DateField label="Finish date" value="" anchor="2027-02-01" onChange={onChange} />);
    expect(screen.getByText('Choose a date')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Finish date' }));
    expect(screen.getByText('February 2027')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '10 Feb 2027' }));
    expect(onChange).toHaveBeenCalledWith('2027-02-10');
  });

  it('moves between months and years', async () => {
    await render(<DateField label="Start date" value="2027-02-01" onChange={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start date' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('March 2027')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Previous year' }));
    expect(screen.getByText('March 2026')).toBeTruthy();
  });
});

describe('periods and schedule lists', () => {
  it('requires the finish date to be after the start date', () => {
    const periods = findEntity('periods')!;
    const base = { ...initialValues(periods), name: 'T1' };
    expect(validateValues(periods, { ...base, start_date: '2027-02-01', finish_date: '2027-02-01' }, true)).toEqual({
      finish_date: 'The finish date must be after the start date',
    });
    expect(validateValues(periods, { ...base, start_date: '2027-02-01', finish_date: '2027-04-11' }, true)).toEqual({});
    expect(validateValues(periods, { ...base, start_date: '2027-02-30', finish_date: '2027-04-11' }, true)).toEqual({
      start_date: 'Use the format YYYY-MM-DD',
    });
  });

  it('filters schedules by period, class and day', () => {
    const schedules = findEntity('schedules')!;
    expect(schedules.filters?.map((filter) => filter.label)).toEqual(['Period', 'Class', 'Day']);
    const row = { class: { name: 'Maths' }, academic_period: { name: 'T1' }, week_day: 3 };
    expect(schedules.filters?.map((filter) => filter.value(row))).toEqual(['T1', 'Maths', 'Wed']);
  });
});
