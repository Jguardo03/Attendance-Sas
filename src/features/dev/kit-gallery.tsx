import { useState } from 'react';
import { View } from 'react-native';

import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  Collapsible,
  DateField,
  Dropdown,
  EmptyState,
  ListRow,
  SegmentedTabs,
  Select,
  Text,
  TextField,
  TimeField,
  type BadgeTone,
} from '@/components/ui';

// Development only: the shared UI kit in every variant and state, shown in the UI gallery (Profile > Dev: UI gallery).
const sessionPills: [string, BadgeTone][] = [
  ['Live', 'live'],
  ['Upcoming', 'upcoming'],
  ['Finished', 'neutral'],
  ['Rescheduled', 'rescheduled'],
  ['Cancelled', 'cancelled'],
];
const attendancePills: [string, BadgeTone][] = [
  ['Present', 'success'],
  ['Late', 'warning'],
  ['Absent', 'danger'],
  ['Not checked in', 'neutral'],
];

export function KitGallery() {
  const [tab, setTab] = useState('active');
  const [status, setStatus] = useState('present');
  const [klass, setKlass] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [all, setAll] = useState(false);
  const [one, setOne] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  return (
    <View className="gap-4">
      <Card title="Buttons">
        <Button label="Check in" icon="check" />
        <Button variant="secondary" label="Show QR code" icon="qr" />
        <Button variant="ghost" label="Cancel" />
        <Button variant="danger" label="Sign out" />
        <Button label="Check in opens 12:50" disabled />
        <Button variant="secondary" label="Disabled secondary" disabled />
        <Button size="large" label="Large, mobile primary" />
        <Button size="large" variant="secondary" label="Large, secondary" />
      </Card>

      <Card title="Status pills">
        <Text variant="meta">Session</Text>
        <View className="flex-row flex-wrap gap-2">
          {sessionPills.map(([label, tone]) => (
            <Badge key={label} label={label} tone={tone} dot={tone === 'live'} />
          ))}
        </View>
        <Text variant="meta">Attendance</Text>
        <View className="flex-row flex-wrap gap-2">
          {attendancePills.map(([label, tone]) => (
            <Badge key={label} label={label} tone={tone} dot />
          ))}
        </View>
        <Text variant="meta">Without a dot (percentages and tags)</Text>
        <View className="flex-row flex-wrap gap-2">
          <Badge label="92%" tone="success" />
          <Badge label="64%" tone="danger" />
          <Badge label="Role: student" />
        </View>
      </Card>

      <Card title="Cards">
        <Text variant="meta">A default card holds this. Inside it, a flat block:</Text>
        <Card variant="flat" title="Flat block">
          <Text variant="meta">Radius 14, a hairline, no shadow.</Text>
        </Card>
      </Card>
      <Card variant="hero" title="Hero card">
        <Text className="font-inter-bold text-title text-primary-content">[Class name]</Text>
        <Text className="text-primary-content">09:00 to 11:00 · [Room]</Text>
        <Button variant="secondary" size="large" label="Check in" icon="check" />
      </Card>

      <Card title="Text styles">
        <Text variant="title">Title</Text>
        <Text variant="section">Section</Text>
        <Text variant="card">Card</Text>
        <Text>Body</Text>
        <Text variant="meta">Meta</Text>
        <Text variant="label">Label</Text>
        <Text variant="error">Error text</Text>
      </Card>

      <Card title="Inputs">
        <TextField label="Email" value={email} onChangeText={setEmail} placeholder="name@institution.edu" />
        <TextField label="Email (with an error)" value="not-an-email" onChangeText={() => undefined} error="Enter a valid email address." />
        <TextField label="Reason (required)" value={reason} onChangeText={setReason} placeholder="Why is this changing?" multiline />
        <Select
          label="Status"
          value={status}
          options={[
            { value: 'present', label: 'Present' },
            { value: 'late', label: 'Late' },
            { value: 'absent', label: 'Absent' },
          ]}
          onChange={setStatus}
        />
        <Dropdown
          label="Class"
          value={klass}
          options={[
            { value: '1', label: 'Web Development' },
            { value: '2', label: 'Database Systems' },
            { value: '3', label: 'Cultural Studies' },
          ]}
          onChange={setKlass}
          placeholder="Choose a class"
        />
        <Dropdown label="Location (with an error)" value="" options={[{ value: '1', label: 'Room 1.01' }]} onChange={() => undefined} error="Booked at this time" />
        <DateField label="Start date" value={date} onChange={setDate} />
        <TimeField label="Checked in at" value={time} onChange={setTime} />
        <Checkbox label="Select all" checked={all} partial={one && !all} onChange={() => setAll((value) => !value)} />
        <Checkbox label="Present" checked={one} onChange={() => setOne((value) => !value)} />
        <Checkbox label="Not chosen" checked={false} onChange={() => undefined} />
      </Card>
      <Collapsible title="Filters (2)">
        <Text variant="meta">Content that opens and closes.</Text>
      </Collapsible>

      <Card title="Banners">
        {dismissed ? null : (
          <Banner tone="error" title="Location already booked" message="[Room] is booked for [Other class] on Mon, 09:00 to 11:00. Choose another location or time." onDismiss={() => setDismissed(true)} actions={[{ label: 'View booking', onPress: () => undefined }]} />
        )}
        <Banner tone="warning" message="Check in closes at 11:00." />
        <Banner tone="info" title="Keep Bluetooth on" message="Stay inside the room while your phone finds the beacon." />
        <Banner tone="success" message="The change was saved with your name." />
        {dismissed ? <Button variant="ghost" label="Show the error again" onPress={() => setDismissed(false)} /> : null}
      </Card>

      <Card title="Tabs and list rows">
        <SegmentedTabs
          label="Period"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: 'Active period' },
            { value: 'previous', label: 'Previous' },
          ]}
        />
        <ListRow icon="calendar" title="Periods" onPress={() => undefined} />
        <ListRow icon="classes" title="Classes" subtitle="Courses and their schedules" onPress={() => undefined} />
        <ListRow icon="users" title="Users" onPress={() => undefined} last />
      </Card>

      <Card title="Empty state">
        <EmptyState image="calendar" title="No sessions today" message="Enjoy the free time. Your next session is Mon 26 Oct at 09:00." actionLabel="Open calendar" onAction={() => undefined} />
      </Card>
    </View>
  );
}
