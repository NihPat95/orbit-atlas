const EXPLICIT_UTC_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;

export function utcMilliseconds(timestamp: string): number {
  const milliseconds = Date.parse(timestamp);
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`Invalid UTC time: ${timestamp}`);
  }
  if (!EXPLICIT_UTC_OFFSET.test(timestamp)) {
    throw new Error("UTC timestamps require an explicit UTC offset");
  }
  return milliseconds;
}
