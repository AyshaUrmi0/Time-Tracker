import { format, startOfDay, endOfDay, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

/** Convert a UTC Date to the given timezone (returns a Date whose local parts represent the zoned time). */
export function toUserTimezone(utc: Date, timezone: string): Date {
  return toZonedTime(utc, timezone);
}

/** Returns the UTC instant corresponding to 00:00:00 of the given day in the user's timezone. */
export function getUserDayStart(date: Date, timezone: string): Date {
  const zoned = toZonedTime(date, timezone);
  const localStart = startOfDay(zoned);
  return fromZonedTime(localStart, timezone);
}

/** Returns the UTC instant corresponding to 23:59:59.999 of the given day in the user's timezone. */
export function getUserDayEnd(date: Date, timezone: string): Date {
  const zoned = toZonedTime(date, timezone);
  const localEnd = endOfDay(zoned);
  return fromZonedTime(localEnd, timezone);
}

/** Returns the UTC instant corresponding to Monday 00:00:00 of the week containing `date`, in the user's timezone. */
export function getUserWeekStart(date: Date, timezone: string): Date {
  const zoned = toZonedTime(date, timezone);
  const localWeekStart = startOfWeek(zoned, { weekStartsOn: 1 });
  return fromZonedTime(localWeekStart, timezone);
}

/** Format a UTC instant as a string in the user's timezone. */
export function formatInUserTimezone(
  date: Date,
  timezone: string,
  fmt: string,
): string {
  return formatInTimeZone(date, timezone, fmt);
}

/** Convenience: pure UTC formatter (no TZ conversion). */
export function formatUtc(date: Date, fmt: string): string {
  return format(date, fmt);
}
