/** User-created foods are private; every other source represents the shared catalog. */
export function isCatalogFoodSource(source: string): boolean {
  return source !== 'custom';
}
