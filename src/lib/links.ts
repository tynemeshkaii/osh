/** Builds outbound contact links from content values. No copy lives here. */

/** "+971 50 914 4215" → "971509144215" */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function telHref(phone: string): string {
  return `tel:+${phoneDigits(phone)}`;
}

export function whatsappHref(phone: string, message?: string): string {
  const base = `https://wa.me/${phoneDigits(phone)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
