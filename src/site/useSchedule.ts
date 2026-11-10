import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Api, Interval, PublicData } from '../data/types';
import { addDays, shopNow } from '../lib/format';
import type { ScheduleCtx } from '../lib/schedule';

export interface Schedule {
  data: PublicData | null;
  ctx: ScheduleCtx | null;
  error: boolean;
  refresh: () => Promise<void>;
}

/** Dados públicos + horários ocupados, atualizados a cada minuto e ao voltar para a aba. */
export function useSchedule(api: Api): Schedule {
  const [data, setData] = useState<PublicData | null>(null);
  const [busy, setBusy] = useState<Interval[]>([]);
  const [now, setNow] = useState(shopNow);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const n = shopNow();
      const pd = await api.getPublicData();
      const b = await api.getBusy(n.day, addDays(n.day, pd.settings.horizonDays));
      setData(pd);
      setBusy(b);
      setNow(n);
      setError(false);
    } catch {
      setError(true);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    const onVis = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refresh]);

  const ctx = useMemo<ScheduleCtx | null>(
    () => (data ? { hours: data.hours, daysOff: new Set(data.daysOff), settings: data.settings, busy, now } : null),
    [data, busy, now],
  );

  return { data, ctx, error, refresh };
}
