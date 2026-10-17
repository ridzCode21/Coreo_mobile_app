import type { TrainingWeekExercise, TrainingWeekSession } from '@/shared/types/trainingWeek';

export function formatSetLine(exercise: TrainingWeekExercise): string {
  const base = `${exercise.sets} × ${exercise.reps}`;
  if (exercise.superset) return `${base} superset`;
  if (exercise.weight_kg !== null) return `${base} · ${exercise.weight_kg} kg`;
  return base;
}

export function capitalizeWeekday(weekday: string): string {
  return weekday.length === 0 ? weekday : `${weekday[0].toUpperCase()}${weekday.slice(1)}`;
}

export function progressionShortForm(note: string | null): string | null {
  if (!note) return null;
  const match = note.match(/^([^\s]+) is (\+[0-9]+(?:\.[0-9]+)? kg) from last week\./);
  return match ? `${match[1].toLowerCase()} ${match[2]}` : null;
}

export function formatSessionSubtitle(session: TrainingWeekSession): string {
  const weekday = capitalizeWeekday(session.weekday);
  if (session.status === 'done') {
    return `${weekday} · done · ${session.movement_count} movements`;
  }
  if (session.key === 'sport') {
    return session.note ? `${weekday} · ${session.note}` : weekday;
  }
  const duration = session.duration_min === null ? null : `${session.duration_min} min`;
  if (session.status === 'today') {
    const progression = progressionShortForm(session.progression_note);
    return [duration, `${session.movement_count} movements`, progression]
      .filter(Boolean)
      .join(' · ');
  }
  return [weekday, duration, `${session.movement_count} movements`].filter(Boolean).join(' · ');
}
