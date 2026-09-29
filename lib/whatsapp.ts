/** WhatsApp click-to-chat link (PRD §3.4). No API: wa.me with a pre-filled, encoded message. */
export function whatsappLink(number: string, message: string, context?: string): string {
  const digits = number.replace(/\D/g, "");
  const text = context ? `${message} (${context})` : message;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** tel: link from a human-formatted number, e.g. "+234 703 343 5818" → "tel:+2347033435818". */
export function telLink(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}
