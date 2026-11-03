import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { formatDayShort, hhmm, whenAndWhere, type Session } from '@/features/sessions/format';

const banner = require('../../../../assets/images/Artboard Banner.png');

const waiting = (session: Session) => session.status === 'scheduled' || session.status === 'rescheduled';

// The blue banner at the top of Home for students and lecturers: the date, the greeting and one line about the session
// that matters now. While one is live it shows that session and the `action` button; with none live it shows the next one
// later today, or says there is nothing more today and when the next one is, and has no button. `todays` is undefined while the list is still loading.
export function HomeBanner({
  date,
  title,
  todays,
  upcoming,
  live,
  detail,
  action,
  message,
}: {
  date: string;
  title: string;
  todays?: Session[];
  upcoming?: Session[];
  live?: Session;
  detail?: ReactNode;
  action?: ReactNode;
  message?: string;
}) {
  const session = live ?? todays?.find(waiting);

  let line: string | undefined = message;
  if (!message && !session && todays) {
    const first = upcoming?.find(waiting);
    line = todays.length > 0 ? 'No more sessions today.' : 'No sessions today.';
    if (first) line += ` Your next one is ${formatDayShort(first.session_date)} at ${hhmm(first.start_time)}.`;
  }

  return (
    <Card variant="hero" image={banner}>
      <Text variant="meta" className="text-primary-content">{date}</Text>
      <Text className="font-inter-bold text-title text-primary-content">{title}</Text>
      {session ? (
        <View className="mt-1 flex-row flex-wrap items-center gap-3">
          <View className="min-w-48 flex-1 gap-1">
            <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
              {live ? <Badge label="Live now" tone="upcoming" dot /> : null}
              <Text className="shrink text-primary-content">{`${live ? '' : 'Next: '}${session.class_name} · ${whenAndWhere(session)}`}</Text>
            </View>
            {detail}
          </View>
          {live && action ? <View className="w-full md:w-auto md:min-w-44">{action}</View> : null}
        </View>
      ) : line ? (
        <Text className="text-primary-content">{line}</Text>
      ) : null}
    </Card>
  );
}
