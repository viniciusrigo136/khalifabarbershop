import { useEffect, useState } from 'react';
import { SHOP } from '../config';

const fmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SHOP.timeZone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export type ShopTime = { hh: string; mm: string; hour: number };

function read(): ShopTime {
  const parts = fmt.formatToParts(new Date());
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return { hh, mm, hour: Number(hh) };
}

/** Hora atual em Coronel Freitas, atualizada na virada de cada minuto. */
export function useShopTime() {
  const [time, setTime] = useState(read);
  useEffect(() => {
    let id: number;
    const tick = () => {
      setTime((prev) => {
        const next = read();
        return next.hh === prev.hh && next.mm === prev.mm ? prev : next;
      });
      id = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    id = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    return () => window.clearTimeout(id);
  }, []);
  return time;
}

export function greeting(hour: number) {
  if (hour < 5) return 'Madrugada, e a Chiodi está aberta.';
  if (hour < 12) return 'Bom dia. A Chiodi está aberta.';
  if (hour < 18) return 'Boa tarde. A Chiodi está aberta.';
  return 'Boa noite. A Chiodi está aberta.';
}
