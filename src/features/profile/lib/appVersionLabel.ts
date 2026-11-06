type AppConfig = {
  version?: string;
  ios?: { buildNumber?: string };
  android?: { versionCode?: number };
};

export function getAppVersionLabel(
  config: AppConfig,
  platformOS: 'ios' | 'android' | string,
): string | null {
  const version = config.version?.trim();
  if (!version) return null;

  const build = platformOS === 'ios' ? config.ios?.buildNumber : config.android?.versionCode;
  return build === undefined ? `v${version}` : `v${version} (Build ${build})`;
}
