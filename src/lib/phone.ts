export const digits = (s: string) => (s || '').replace(/\D/g, '');

/** Máscara (DD) 9XXXX-XXXX enquanto digita. */
export function maskPhone(s: string): string {
  let d = digits(s);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Telefone brasileiro com DDD: 10 (fixo) ou 11 (celular) dígitos, DDD sem zero. */
export function isValidPhone(s: string): boolean {
  return /^[1-9]\d{9,10}$/.test(digits(s));
}

/** Para links wa.me: garante o 55 na frente. */
export const toWhatsApp = (phone: string) => {
  const d = digits(phone);
  return d.startsWith('55') && d.length > 11 ? d : `55${d}`;
};
