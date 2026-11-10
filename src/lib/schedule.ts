import type { DayKey, HoursWindow, Interval, Settings } from '../data/types';
import { addDays, weekdayOf } from './format';

export interface ScheduleCtx {
  hours: HoursWindow[];
  daysOff: ReadonlySet<DayKey> | DayKey[];
  settings: Settings;
  busy: Interval[];
  now: { day: DayKey; minutes: number };
}

const isOff = (ctx: ScheduleCtx, day: DayKey) =>
  Array.isArray(ctx.daysOff) ? ctx.daysOff.includes(day) : (ctx.daysOff as ReadonlySet<DayKey>).has(day);

export const windowsFor = (hours: HoursWindow[], day: DayKey) =>
  hours.filter((h) => h.weekday === weekdayOf(day)).sort((a, b) => a.startMin - b.startMin);

export const lastBookableDay = (ctx: Pick<ScheduleCtx, 'now' | 'settings'>) => addDays(ctx.now.day, ctx.settings.horizonDays);

/** O dia está fechado por regra (sem expediente ou folga)? */
export function isClosed(ctx: ScheduleCtx, day: DayKey): boolean {
  return windowsFor(ctx.hours, day).length === 0 || isOff(ctx, day);
}

/**
 * Horários de início livres para um serviço de `dur` minutos no dia.
 * Mesmas regras de public.book_appointment no banco — mantenha os dois iguais.
 */
export function freeSlots(ctx: ScheduleCtx, day: DayKey, dur: number, opts: { ignoreAdvance?: boolean } = {}): number[] {
  if (!day || !dur) return [];
  const { now, settings } = ctx;
  if (day < now.day || day > lastBookableDay(ctx) || isOff(ctx, day)) return [];
  const minStart = day === now.day ? now.minutes + (opts.ignoreAdvance ? 0 : settings.minAdvanceMin) : -1;
  const busy = ctx.busy.filter((b) => b.day === day);
  const out: number[] = [];
  for (const w of windowsFor(ctx.hours, day)) {
    for (let t = w.startMin; t + dur <= w.endMin; t += settings.slotStepMin) {
      if (t < minStart) continue;
      if (busy.some((b) => t < b.endMin && t + dur > b.startMin)) continue;
      out.push(t);
    }
  }
  return out;
}

/** Primeiro horário livre a partir de hoje (para o card "Próximo horário livre"). */
export function nextFree(ctx: ScheduleCtx, dur: number, maxDays = 14): { day: DayKey; startMin: number } | null {
  for (let i = 0; i <= Math.min(maxDays, ctx.settings.horizonDays); i++) {
    const day = addDays(ctx.now.day, i);
    const s = freeSlots(ctx, day, dur);
    if (s.length) return { day, startMin: s[0] };
  }
  return null;
}
