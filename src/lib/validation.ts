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

/** Step 1 fields: when and what. */
export interface Step1Input {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  guests: string | number;
  offer: string;
}

/** Step 2 fields: who and where to confirm. */
export interface Step2Input {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  consent: boolean | string;
}

export type BookingInput = Step1Input & Step2Input & { variant?: string };

export type FieldName = keyof BookingInput;

/** Keys of `content.form.errors`. Kept in sync by the Content type in schema.ts. */
export type ErrorKey =
  | 'dateTimeRequired'
  | 'guestsInvalid'
  | 'offerRequired'
  | 'nameRequired'
  | 'phoneRequired'
  | 'phoneInvalid'
  | 'emailInvalid'
  | 'consentRequired';

export type FieldErrors = Partial<Record<FieldName, ErrorKey>>;

export interface Validated {
  date: string;
  time: string;
  guests: number;
  offer: OfferId;
  name: string;
  phone: string; // E.164, e.g. +971509144215
  email: string | null;
  notes: string | null;
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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

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

function isTruthyConsent(v: boolean | string | undefined): boolean {
  return v === true || v === 'on' || v === 'true' || v === '1';
}

/** Today's date as YYYY-MM-DD in the runtime's local zone. Injectable for tests. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export function validateStep1(input: Step1Input, today: string = todayIso()): FieldErrors {
  const errors: FieldErrors = {};

  const date = String(input.date ?? '').trim();
  const time = String(input.time ?? '').trim();
  const dateOk = DATE_RE.test(date) && date >= today;
  if (!dateOk || !TIME_RE.test(time)) errors.date = 'dateTimeRequired';

  const guests = Number(input.guests);
  if (!Number.isInteger(guests) || guests < GUESTS_MIN || guests > GUESTS_MAX) {
    errors.guests = 'guestsInvalid';
  }

  if (!OFFER_IDS.includes(input.offer as OfferId)) errors.offer = 'offerRequired';

  return errors;
}

export function validateStep2(input: Step2Input): FieldErrors {
  const errors: FieldErrors = {};

  if (String(input.name ?? '').trim().length < 2) errors.name = 'nameRequired';

  const phoneRaw = String(input.phone ?? '').trim();
  if (!phoneRaw) errors.phone = 'phoneRequired';
  else if (!normalizePhone(phoneRaw)) errors.phone = 'phoneInvalid';

  const email = String(input.email ?? '').trim();
  if (email && !EMAIL_RE.test(email)) errors.email = 'emailInvalid';

  if (!isTruthyConsent(input.consent)) errors.consent = 'consentRequired';

  return errors;
}

/** Full check. On success returns a normalised payload ready for the server. */
export function validateBooking(input: BookingInput, today: string = todayIso()): ValidationResult {
  const errors: FieldErrors = { ...validateStep1(input, today), ...validateStep2(input) };
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const variant = String(input.variant ?? '');
  return {
    ok: true,
    value: {
      date: input.date.trim(),
      time: input.time.trim(),
      guests: Number(input.guests),
      offer: input.offer as OfferId,
      name: input.name.trim(),
      phone: normalizePhone(input.phone)!,
      email: String(input.email ?? '').trim() || null,
      notes: String(input.notes ?? '').trim().slice(0, 500) || null,
      consent: true,
      variant: variant === 'view' || variant === 'business' || variant === 'price' ? variant : null,
    },
  };
}
