import type { MockUser } from '@/shared/api/mock/db';

function computeAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

/**
 * Maps the internal mock user record to the public `<User>` shape from API_REFERENCE.md §3 —
 * strips the mock-only `password` field and derives `full_name`/`age`/`profile`, exactly what a
 * real backend's serializer would do. Shared by register now; login/profile-GET reuse this once
 * Phase 2 reconciles the rest of auth.
 */
export function serializeMockUser(user: MockUser) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: `${user.first_name} ${user.last_name}`.trim(),
    phone: user.phone,
    date_of_birth: user.date_of_birth,
    age: user.date_of_birth ? computeAge(user.date_of_birth) : null,
    gender: user.gender,
    timezone: user.timezone,
    is_premium: user.is_premium,
    email_verified: user.email_verified,
    phone_verified: user.phone_verified,
    profile: {
      avatar: null,
      bio: '',
      preferred_language: 'en',
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
