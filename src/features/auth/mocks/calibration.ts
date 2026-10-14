import type { CalibrationState } from '@/shared/types/user';

export const CALIBRATION_DAYS = 4;
const MS_PER_DAY = 86_400_000;

function localDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function calibrationFields(startedOn: string | null, today: Date): CalibrationState {
  if (startedOn === null) {
    return { calibration_day: null, calibration_complete: true, wave: 'solid' };
  }

  const start = localDate(startedOn);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = Math.max(1, Math.round((current.getTime() - start.getTime()) / MS_PER_DAY) + 1);
  const complete = day >= CALIBRATION_DAYS;

  return {
    calibration_day: day,
    calibration_complete: complete,
    wave: complete ? 'solid' : 'dashed',
  };
}

export function localDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
