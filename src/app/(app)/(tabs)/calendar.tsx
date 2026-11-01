import { audienceOf } from '@/features/sessions/audience';
import { WeekCalendar } from '@/features/sessions/week-calendar';
import { AdminCalendar } from '@/features/teaching/admin-calendar';
import { useAuth } from '@/providers/auth';

export default function CalendarScreen() {
  const { can } = useAuth();
  // Admins get the week strip with session counts per day; everyone else gets their own week.
  return audienceOf(can) === 'admin' ? <AdminCalendar /> : <WeekCalendar />;
}
