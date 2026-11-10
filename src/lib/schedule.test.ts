import { describe, expect, it } from 'vitest';
import { freeSlots, isClosed, nextFree, type ScheduleCtx } from './schedule';
import { addDays, inputToCents, shopNow, weekdayOf } from './format';
import { isValidPhone, maskPhone } from './phone';

const W = [
  [510, 690],
  [780, 1200],
];
const hours = [2, 3, 4, 5, 6].flatMap((weekday) => W.map(([startMin, endMin]) => ({ weekday, startMin, endMin })));
const settings = { slotStepMin: 15, minAdvanceMin: 60, horizonDays: 30 };
// 2026-11-10 é uma terça-feira
const TUE = '2026-11-10';

const ctx = (over: Partial<ScheduleCtx> = {}): ScheduleCtx => ({
  hours,
  daysOff: [],
  settings,
  busy: [],
  now: { day: TUE, minutes: 0 },
  ...over,
});

describe('freeSlots', () => {
  it('lista horários dentro das janelas, no passo de 15 min', () => {
    const s = freeSlots(ctx(), TUE, 30);
    expect(s[0]).toBe(510);
    expect(s).toContain(660); // 11:00–11:30 cabe
    expect(s).not.toContain(675); // 11:15–11:45 estoura a manhã
    expect(s).toContain(780);
    expect(s.at(-1)).toBe(1170);
  });

  it('respeita a antecedência mínima no dia de hoje', () => {
    const s = freeSlots(ctx({ now: { day: TUE, minutes: 14 * 60 + 5 } }), TUE, 30);
    expect(s[0]).toBe(15 * 60 + 15);
  });

  it('remove horários que colidem com ocupados', () => {
    const s = freeSlots(ctx({ busy: [{ day: TUE, startMin: 780, endMin: 810 }] }), TUE, 45);
    expect(s).not.toContain(780);
    expect(s).not.toContain(765);
    expect(s).toContain(810);
  });

  it('fecha domingo/segunda, folgas, passado e além do horizonte', () => {
    expect(isClosed(ctx(), '2026-11-09')).toBe(true); // segunda
    expect(freeSlots(ctx({ daysOff: [TUE] }), TUE, 30)).toEqual([]);
    expect(freeSlots(ctx(), '2026-11-07', 30)).toEqual([]); // passado
    expect(freeSlots(ctx(), addDays(TUE, 31), 30)).toEqual([]);
  });

  it('nextFree pula para o próximo dia útil', () => {
    const n = nextFree(ctx({ now: { day: '2026-11-14', minutes: 23 * 60 } }), 30); // sábado à noite
    expect(n).toEqual({ day: '2026-11-17', startMin: 510 });
  });
});

describe('format', () => {
  it('weekday e addDays atravessam meses', () => {
    expect(weekdayOf(TUE)).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('shopNow usa o fuso de São Paulo', () => {
    expect(shopNow(new Date('2026-11-10T02:30:00Z'))).toEqual({ day: '2026-11-09', minutes: 23 * 60 + 30 });
  });
  it('inputToCents aceita formatos brasileiros', () => {
    expect(inputToCents('45')).toBe(4500);
    expect(inputToCents('45,5')).toBe(4550);
    expect(inputToCents('1.234,50')).toBe(123450);
    expect(Number.isNaN(inputToCents('abc'))).toBe(true);
  });
});

describe('phone', () => {
  it('mascara e valida', () => {
    expect(maskPhone('49999991234')).toBe('(49) 99999-1234');
    expect(maskPhone('5549999991234')).toBe('(49) 99999-1234');
    expect(isValidPhone('(49) 99999-1234')).toBe(true);
    expect(isValidPhone('(09) 99999-1234')).toBe(false);
    expect(isValidPhone('9999')).toBe(false);
  });
});
