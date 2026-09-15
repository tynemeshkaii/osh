/**
 * Types mirroring src/content/lunch.en.json plus a type-safe loader.
 * The JSON is the single source of copy — components never hold strings.
 *
 * Values wrapped in {{ }} are placeholders awaiting real data. Use the
 * helpers at the bottom so raw placeholders never reach the user.
 */

import raw from './lunch.en.json';

export type HeroVariantId = 'view' | 'business' | 'price';
export const HERO_VARIANTS: readonly HeroVariantId[] = ['view', 'business', 'price'] as const;

export interface HeroVariant {
  h1: string;
  sub: string;
  /** Trust line under the CTA. Per variant: a business guest wants different proof than a view guest. */
  trustStrip: string[];
}

export interface HeroMedia {
  video: string;
  poster: string;
  alt: string;
}

export interface Hero {
  eyebrow: string;
  media: HeroMedia;
  variants: Record<HeroVariantId, HeroVariant>;
  defaultVariant: HeroVariantId;
  cta: string;
  ctaAlternatives: string[];
  ctaMicrocopy: string;
  /** Secondary hero CTA: opens WhatsApp with `whatsappMessage` prefilled. */
  ctaSecondary: string;
  whatsappMessage: string;
}

export type OfferId = 'set' | 'alacarte';
export type SeatingId = 'terrace' | 'indoor' | 'any';

export interface Quote {
  text: string;
  author: string;
  source: string;
}

export interface SocialProof {
  heading: string;
  ratingLine: string;
  quotes: Quote[];
  pressCaption: string;
}

export interface GalleryItem {
  src: string;
  alt: string;
  caption: string;
  /** CSS aspect-ratio value, e.g. "3 / 2". Fixed per slot against CLS. */
  aspect: string;
}

export interface Gallery {
  heading: string;
  sub: string;
  items: GalleryItem[];
}

export interface FieldBase {
  label: string;
  helper?: string;
  placeholder?: string;
  optionalSuffix?: string;
  required?: boolean;
}

export interface OfferOption {
  value: OfferId;
  label: string;
  default: boolean;
}

export interface OfferField extends FieldBase {
  options: OfferOption[];
}

export interface SeatingOption {
  value: SeatingId;
  label: string;
  default: boolean;
}

export interface SeatingField extends FieldBase {
  options: SeatingOption[];
}

export interface GuestsField extends FieldBase {
  /** The last pill: opens the number input for larger parties. */
  more: string;
  /** Label of that number input. */
  moreLabel: string;
}

export interface DateField extends FieldBase {
  /** Quick picks shown before the native date input. */
  quick: { today: string; tomorrow: string; pick: string };
  /** Shown when the last seating of today has already passed. */
  todayClosed: string;
}

export interface NotesField extends FieldBase {
  /** Summary line of the collapsed <details>; the field opens on tap. */
  toggle: string;
}

export interface FormStep1 {
  heading: string;
  fields: {
    date: DateField;
    time: FieldBase;
    guests: GuestsField;
    seating: SeatingField;
  };
  cta: string;
}

export interface FormStep2 {
  heading: string;
  fields: {
    name: FieldBase;
    phone: FieldBase;
    offer: OfferField;
    notes: NotesField;
  };
  cta: string;
  ctaLoading: string;
  /** Consent by submission — replaces the checkbox. Sits directly under the submit button. */
  consentNote: string;
  microcopy: string;
}

export interface FormErrors {
  nameRequired: string;
  phoneRequired: string;
  phoneInvalid: string;
  dateRequired: string;
  timeRequired: string;
  timePassed: string;
  guestsInvalid: string;
  offerRequired: string;
  slotUnavailable: string;
  network: string;
  server: string;
}

export interface WhatsappBlock {
  heading: string;
  body: string;
  cta: string;
  prefilledMessage: string;
}

export interface Form {
  heading: string;
  sub: string;
  progress: { step1: string; step2: string; back: string };
  step1: FormStep1;
  step2: FormStep2;
  errors: FormErrors;
  /** Draft-only line under the thank-you screen while there is no backend. */
  thanksNote: string;
  whatsappBlock: WhatsappBlock;
}

export interface Thanks {
  h1: string;
  summaryTemplate: string;
  steps: string[];
  /** What happens when the requested slot is full. */
  ifUnavailable: string;
  cta: string;
  ctaMicrocopy: string;
  instagram: string;
}

export interface StickyCta {
  label: string;
  note: string;
  /** Replaces `note` once the visitor has started the form. */
  noteResume: string;
}

export interface ExternalLink {
  url: string;
  label: string;
}

export interface Links {
  instagram: ExternalLink;
  googleProfile: ExternalLink;
  maps: ExternalLink;
}

export interface Footer {
  address: string;
  phone: string;
  copyright: string;
}

export interface Seo {
  title: string;
  description: string;
  ogImageAlt: string;
}

export interface Draft {
  banner: string;
  placeholderPrefix: string;
}

export interface Content {
  _meta: { locale: string; version: string; note: string };
  _placeholders: Record<string, string>;
  draft: Draft;
  seo: Seo;
  hero: Hero;
  socialProof: SocialProof;
  gallery: Gallery;
  form: Form;
  thanks: Thanks;
  stickyCta: StickyCta;
  links: Links;
  footer: Footer;
}

/**
 * JSON imports widen string literals to `string`, so enum-like fields
 * (variant ids, offer ids) are checked at runtime. Everything else is
 * checked structurally at compile time via `Loose<Content>`.
 */
type Loose<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Loose<U>[]
    : T extends object
      ? { [K in keyof T]: Loose<T[K]> }
      : T;

const OFFER_IDS: readonly OfferId[] = ['set', 'alacarte'] as const;
const SEATING_IDS: readonly SeatingId[] = ['terrace', 'indoor', 'any'] as const;

function isOneOf<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

function parseContent(shape: Loose<Content>): Content {
  const { hero, form } = shape;
  if (!isOneOf(HERO_VARIANTS, hero.defaultVariant)) {
    throw new Error(`content.hero.defaultVariant: unknown variant "${hero.defaultVariant}"`);
  }
  for (const id of HERO_VARIANTS) {
    if (!(id in hero.variants)) throw new Error(`content.hero.variants: missing "${id}"`);
  }
  for (const opt of form.step2.fields.offer.options) {
    if (!isOneOf(OFFER_IDS, opt.value)) {
      throw new Error(`content.form.step2.fields.offer.options: unknown value "${opt.value}"`);
    }
  }
  for (const opt of form.step1.fields.seating.options) {
    if (!isOneOf(SEATING_IDS, opt.value)) {
      throw new Error(`content.form.step1.fields.seating.options: unknown value "${opt.value}"`);
    }
  }
  return shape as Content;
}

/** Typed content. Compile fails if the JSON drifts structurally; build fails if an enum value is off. */
export const content: Content = parseContent(raw);

export function loadContent(): Content {
  return content;
}

// ---------------------------------------------------------------------------
// Placeholder helpers
// ---------------------------------------------------------------------------

const PLACEHOLDER_RE = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;

/**
 * Draft mode (DRAFT=true at build time) renders unreplaced placeholders as
 * visible "TBD: …" markers so a reviewer sees where data will go. In normal
 * builds the helpers below hide such content instead, so raw {{X}} never
 * reaches a real visitor.
 */
export const DRAFT = import.meta.env.DRAFT === 'true';

/** True when the string still contains an unreplaced {{PLACEHOLDER}}. */
export function hasPlaceholder(value: string | null | undefined): boolean {
  return typeof value === 'string' && new RegExp(PLACEHOLDER_RE.source).test(value);
}

/** "{{LAST_SEATING}}" → "TBD: last seating". Draft mode only. */
function draftify(value: string): string {
  return value.replace(PLACEHOLDER_RE, (_, key: string) =>
    `${content.draft.placeholderPrefix} ${key.toLowerCase().replace(/_/g, ' ')}`,
  );
}

/** Final copy as-is; placeholders become TBD markers in draft, null otherwise (caller hides). */
export function finalText(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (!hasPlaceholder(value)) return value;
  return DRAFT ? draftify(value) : null;
}

/** Draft: placeholders marked. Otherwise entries with placeholders are dropped. */
export function finalList(values: readonly string[]): string[] {
  return DRAFT ? values.map(draftify) : values.filter((v) => !hasPlaceholder(v));
}

/** Draft: placeholders in the given fields marked. Otherwise such objects are dropped. */
export function finalItems<T extends object>(items: readonly T[], keys: readonly (keyof T)[]): T[] {
  if (DRAFT) {
    return items.map((item) => {
      const copy = { ...item };
      for (const k of keys) {
        const v = copy[k];
        if (typeof v === 'string') copy[k] = draftify(v) as T[typeof k];
      }
      return copy;
    });
  }
  return items.filter((item) =>
    keys.every((k) => {
      const v = item[k];
      return typeof v !== 'string' || !hasPlaceholder(v);
    }),
  );
}
