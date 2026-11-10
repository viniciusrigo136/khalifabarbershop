import { SHOP } from '../config';
import type { DayKey } from '../data/types';

export const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(y: number, m: number, d: number): DayKey {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/** Converte 'YYYY-MM-DD' em Date (meio-dia UTC, imune a fuso/horário de verão). */
export function parseKey(k: DayKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function addDays(k: DayKey, n: number): DayKey {
  const d = parseKey(k);
  d.setUTCDate(d.getUTCDate() + n);
  return toKey(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export const weekdayOf = (k: DayKey) => parseKey(k).getUTCDay();

/** Dia e minuto atuais NO FUSO DA BARBEARIA, independente do fuso do visitante. */
export function shopNow(date = new Date()): { day: DayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { day: toKey(get('year'), get('month') - 1, get('day')), minutes: get('hour') * 60 + get('minute') };
}

export const hm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const hmLabel = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}`;
export const toMinutes = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

export const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const brlShort = (cents: number) => `R$ ${cents % 100 ? (cents / 100).toFixed(2).replace('.', ',') : cents / 100}`;
export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
/** "45,50" | "45.50" | "1.234,50" → centavos; NaN se inválido. */
export function inputToCents(v: string): number {
  const s = v.trim();
  if (!/^\d{1,3}(\.?\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(s)) return NaN;
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return Math.round(parseFloat(norm) * 100);
}

export const durLabel = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}` : `${m} min`);

export function fmtLong(k: DayKey): string {
  const d = parseKey(k);
  return `${WEEKDAYS_SHORT[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}
export function fmtShort(k: DayKey): string {
  const d = parseKey(k);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
}
export function fmtFull(k: DayKey): string {
  return `${fmtShort(k)}/${k.slice(0, 4)}`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
