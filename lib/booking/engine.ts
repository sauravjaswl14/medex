export type Schedule = { startTime: string; endTime: string };
export type Specialist = {
  id: string;
  name: string;
  speciality: string;
  consultation: Schedule & {
    durationInMinutes: number;
    bufferInMinutes: number;
  };
};
export type Provider = {
  id: number;
  name: string;
  country: string;
  timezone: string;
  daySchedules: Record<string, Schedule>;
  specialists: Specialist[];
};
export type Slot = { startTime: string; isBooked: boolean; reason?: string };
export type Reservation = {
  bookingId: string;
  providerId: number;
  specialistId: string;
  date: string;
  startTime: string;
  numberOfPeople: number;
};
export const countryZones: Record<string, string> = {
  TH: "Asia/Bangkok",
  NP: "Asia/Kathmandu",
  IN: "Asia/Kolkata",
};
export function zoneFor(
  provider: Pick<Provider, "timezone" | "country">,
): string {
  const raw = provider.timezone.trim();
  if (/^(Nepal Standard Time)$/i.test(raw)) return "Asia/Kathmandu";
  if (/^Asia\/Katmandu$/i.test(raw)) return "Asia/Kathmandu";
  const offset = raw.match(
    /^(?:\(?\s*(?:GMT|UTC)\s*)?([+-])(\d{1,2}):?(\d{2})\s*\)?$/i,
  );
  if (offset) {
    const minutes = Number(offset[2]) * 60 + Number(offset[3]);
    if (minutes < 24 * 60 && Number(offset[3]) < 60) {
      return offsetToZone(
        offset[1],
        Number(offset[2]),
        Number(offset[3]),
        provider.country,
      );
    }
  }
  if (raw) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: raw });
      return raw;
    } catch {}
  }
  return countryZones[provider.country] ?? "UTC";
}
// Intl does not accept fractional Etc/GMT offsets; Nepal's known offset is mapped to an IANA zone.
function offsetToZone(
  sign: string,
  hours: number,
  minutes: number,
  country: string,
) {
  const total = (sign === "+" ? 1 : -1) * (hours * 60 + minutes);
  const known: Record<number, string> = {
    345: "Asia/Kathmandu",
    330: "Asia/Kolkata",
    420: "Asia/Bangkok",
  };
  return (
    known[total] ??
    (minutes === 0
      ? `Etc/GMT${sign === "+" ? "-" : "+"}${hours}`
      : (countryZones[country] ?? "UTC"))
  );
}
export function dateAt(instant: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function wallInstant(date: string, time: string, zone: string) {
  const guess = Date.parse(`${date}T${time}:00Z`);
  let utc = guess;
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(utc));
    const get = (k: string) => Number(parts.find((p) => p.type === k)?.value);
    const actual = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
    );
    utc += guess - actual;
  }
  return new Date(utc);
}
export function timeAt(instant: Date, zone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}
export function dayReason(
  provider: Provider,
  date: string,
  closures: { providerId: number; date: string; reason: string }[],
  now: Date = new Date(),
) {
  const today = dateAt(now, zoneFor(provider));
  if (date < today) return "Past date";
  if (date > addDays(today, 89)) return "Outside 90-day booking window";
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T12:00:00Z`))
    .toLowerCase();
  if (!provider.daySchedules[weekday]) return "Provider closed";
  const closure = closures.find(
    (c) => c.providerId === provider.id && c.date === date,
  );
  return closure?.reason ?? null;
}
export function makeSlots(
  provider: Provider,
  specialist: Specialist,
  date: string,
  closures: { providerId: number; date: string; reason: string }[],
  booked: Set<string>,
  now: Date = new Date(),
): Slot[] {
  if (dayReason(provider, date, closures, now)) return [];
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T12:00:00Z`))
    .toLowerCase();
  const hours = provider.daySchedules[weekday];
  const c = specialist.consultation;
  const duration = c.durationInMinutes;
  const step = duration + c.bufferInMinutes;
  if (duration <= 0 || step <= 0) return [];
  const result: Slot[] = [];
  for (
    let start = minutes(c.startTime);
    start + duration <= minutes(c.endTime);
    start += step
  ) {
    if (
      start < minutes(hours.startTime) ||
      start + duration > minutes(hours.endTime)
    )
      continue;
    const time = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
    const past =
      wallInstant(date, time, zoneFor(provider)).getTime() <= now.getTime();
    const taken = booked.has(`${provider.id}|${specialist.id}|${date}|${time}`);
    result.push({
      startTime: time,
      isBooked: past || taken,
      ...(past
        ? { reason: "Already started" }
        : taken
          ? { reason: "Booked" }
          : {}),
    });
  }
  return result;
}
export function groupStarts(slots: Slot[], count: number) {
  if (count < 1 || count > 4) return [];
  return slots.filter(
    (s, i) =>
      !s.isBooked &&
      slots.slice(i, i + count).length === count &&
      slots.slice(i, i + count).every((v) => !v.isBooked),
  );
}
export function slotKey(
  providerId: number,
  specialistId: string,
  date: string,
  startTime: string,
) {
  return `${providerId}|${specialistId}|${date}|${startTime}`;
}
export function bookingTimes(
  provider: Provider,
  specialist: Specialist,
  start: string,
  count: number,
) {
  const step =
    specialist.consultation.durationInMinutes +
    specialist.consultation.bufferInMinutes;
  return Array.from({ length: count }, (_, i) => {
    const m = minutes(start) + step * i;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  });
}
