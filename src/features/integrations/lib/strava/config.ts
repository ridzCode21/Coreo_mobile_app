import Constants from 'expo-constants';

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function getStravaClientId(): string | undefined {
  return readString(Constants.expoConfig?.extra?.stravaClientId);
}
