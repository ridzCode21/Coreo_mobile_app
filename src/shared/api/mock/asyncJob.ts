export function advanceOnPoll<T extends { status: string }>(
  entity: T,
  transitions: readonly T['status'][],
  pollCount: number,
): T {
  const currentIndex = transitions.indexOf(entity.status);
  if (currentIndex === -1) return entity;
  const nextIndex = Math.min(currentIndex + Math.max(1, pollCount), transitions.length - 1);
  return { ...entity, status: transitions[nextIndex] };
}
