/**
 * Cross-feature TypeScript types that don't belong to one feature (e.g. shared API envelope
 * shapes). Feature-local types stay in their own feature folder — don't dump everything here.
 */
export type Nullable<T> = T | null;
