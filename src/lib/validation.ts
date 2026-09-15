/**
 * The one validation schema for the booking request. Runs in the browser
 * (BookingForm.astro) and, later, in the Cloudflare Function that receives
 * the request. No copy here: every failure is an `ErrorKey` that maps to
 * `content.form.errors` in src/content/lunch.en.json.
 *
 * Pure, dependency-free, no DOM — so it works in both runtimes as-is.
 */

export type OfferId = 'set' | 'alacarte';
export const OFFER_IDS: readonly OfferId[] = ['set', 'alacarte'] as const;

export type HeroVariantId = 'view' | 'business' | 'price';

/** Where the guest would like to sit. Optional: anything unknown becomes 'any'. */
export type SeatingId = 'terrace' | 'indoor' | 'any';
export const SEATING_IDS: readonly SeatingId[] = ['terrace', 'indoor', 'any'] as const;

/** The restaurant's zone. "Today" and "has this slot passed" are decided here, not in the visitor's zone. */
export const RESTAURANT_TZ = 'Asia/Dubai';

/**
 * Seatings the guest can request, HH:MM, 24h. The last entry is the last
 * seating — the form offers exactly these, nothing else is accepted.
 */
export const TIME_SLOTS: readonly string[] = [
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
] as const;

/** Step 1 fields: when, how many, where. */
export interface Step1Input {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, one of TIME_SLOTS
  guests: string | number;
  seating?: string; // one of SEATING_IDS; missing → 'any'
}

/** Step 2 fields: who, which lunch, where to confirm. */
export interface Step2Input {
  name: string;
  phone: string;
  offer: string;
  notes?: string;
}

export type BookingInput = Step1Input & Step2Input & { variant?: string };

export type FieldName = keyof BookingInput;

/** Keys of `content.form.errors`. Kept in sync by the Content type in schema.ts. */
export type ErrorKey =
  | 'dateRequired'
  | 'timeRequired'
  | 'timePassed'
  | 'guestsInvalid'
  | 'offerRequired'
  | 'nameRequired'
  | 'phoneRequired'
  | 'phoneInvalid';

export type FieldErrors = Partial<Record<FieldName, ErrorKey>>;

export interface Validated {
  date: string;
  time: string;
  guests: number;
  seating: SeatingId;
  offer: OfferId;
  name: string;
  phone: string; // E.164, e.g. +971509144215
  notes: string | null;
  /** Consent is given by submitting — the note under the button says so. Recorded with the request. */
  consent: true;
  variant: HeroVariantId | null;
}

export type ValidationResult =
  | { ok: true; value: Validated }
  | { ok: false; errors: FieldErrors };

export const GUESTS_MIN = 1;
export const GUESTS_MAX = 20;

// ---------------------------------------------------------------------------
// Normalisers
// ---------------------------------------------------------------------------

const E164_RE = /^\+[1-9]\d{7,14}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "+971 50 914 4215" / "00971509144215" / "0509144215" → "+971509144215".
 * A bare local UAE number gets +971; anything else must carry its own code.
 * Returns null when the result is not a plausible E.164 number.
 */
export function normalizePhone(raw: string): string | null {
  let s = raw.trim().replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  else if (/^0\d{8,9}$/.test(s)) s = `+971${s.slice(1)}`;
  else if (/^971\d{8,9}$/.test(s)) s = `+${s}`;
  return E164_RE.test(s) ? s : null;
}

/** Wall clock in the restaurant's zone: { date: YYYY-MM-DD, time: HH:MM }. Injectable for tests. */
export function nowInRestaurantZone(now: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: RESTAURANT_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  // en-GB renders midnight as "24" in some engines.
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}` };
}

/** Today's date as YYYY-MM-DD in the restaurant's zone. */
export function todayIso(now: Date = new Date()): string {
  return nowInRestaurantZone(now).date;
}

/** `date` plus `days` as YYYY-MM-DD. Pure calendar arithmetic, zone-free. */
export function addDaysIso(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y!, m! - 1, d! + days));
  return t.toISOString().slice(0, 10);
}

/** Seating preference is never an error: unknown or missing means no preference. */
export function normalizeSeating(raw: string | undefined): SeatingId {
  const s = String(raw ?? '').trim();
  return (SEATING_IDS as readonly string[]).includes(s) ? (s as SeatingId) : 'any';
}

/** True when `slot` is still requestable on `date` at the given restaurant wall clock. */
export function isSlotOpen(date: string, slot: string, now = nowInRestaurantZone()): boolean {
  if (date > now.date) return true;
  if (date < now.date) return false;
  return slot > now.time;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export function validateStep1(input: Step1Input, now = nowInRestaurantZone()): FieldErrors {
  const errors: FieldErrors = {};

  const date = String(input.date ?? '').trim();
  const time = String(input.time ?? '').trim();
  if (!DATE_RE.test(date) || date < now.date) errors.date = 'dateRequired';
  else if (!TIME_SLOTS.includes(time)) errors.time = 'timeRequired';
  else if (!isSlotOpen(date, time, now)) errors.time = 'timePassed';

  const guests = Number(input.guests);
  if (!Number.isInteger(guests) || guests < GUESTS_MIN || guests > GUESTS_MAX) {
    errors.guests = 'guestsInvalid';
  }

  return errors;
}

export function validateStep2(input: Step2Input): FieldErrors {
  const errors: FieldErrors = {};

  if (String(input.name ?? '').trim().length < 2) errors.name = 'nameRequired';

  const phoneRaw = String(input.phone ?? '').trim();
  if (!phoneRaw) errors.phone = 'phoneRequired';
  else if (!normalizePhone(phoneRaw)) errors.phone = 'phoneInvalid';

  if (!OFFER_IDS.includes(input.offer as OfferId)) errors.offer = 'offerRequired';

  return errors;
}

/** Full check. On success returns a normalised payload ready for the server. */
export function validateBooking(input: BookingInput, now = nowInRestaurantZone()): ValidationResult {
  const errors: FieldErrors = { ...validateStep1(input, now), ...validateStep2(input) };
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const variant = String(input.variant ?? '');
  return {
    ok: true,
    value: {
      date: input.date.trim(),
      time: input.time.trim(),
      guests: Number(input.guests),
      seating: normalizeSeating(input.seating),
      offer: input.offer as OfferId,
      name: input.name.trim(),
      phone: normalizePhone(input.phone)!,
      notes: String(input.notes ?? '').trim().slice(0, 500) || null,
      consent: true,
      variant: variant === 'view' || variant === 'business' || variant === 'price' ? variant : null,
    },
  };
}
