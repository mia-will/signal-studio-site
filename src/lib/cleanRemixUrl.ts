export function cleanRemixUrl(url: string | null | undefined): string {
  if (!url) return '';

  const legacyPrefix = `/${'remix'}`;

  if (url === legacyPrefix) return '/';
  if (url.startsWith(`${legacyPrefix}/`)) return url.slice(legacyPrefix.length);

  return url;
}
