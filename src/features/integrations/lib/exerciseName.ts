/** `STRENGTH_TRAINING` → `Strength Training`: the backend stores a free-text workout type. */
export function titleCaseConstant(name: string): string {
  return name
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
