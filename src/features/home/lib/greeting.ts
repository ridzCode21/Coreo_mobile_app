const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function timeOfDayGreeting(date: Date): 'Morning' | 'Afternoon' | 'Evening' {
  const hour = date.getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export function formatHeaderDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} · ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
