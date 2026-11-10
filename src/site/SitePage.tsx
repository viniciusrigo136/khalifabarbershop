import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useApi } from '../data/api';
import { CloseIcon } from '../components/Icons';
import { addDays, fmtShort, hm, hmLabel, shopNow, weekdayOf, WEEKDAYS_SHORT } from '../lib/format';
import { nextFree } from '../lib/schedule';
import { Booking, type Selection } from './Booking';
import { Header } from './Header';
import { Hero } from './Hero';
import { About, Contact, FinalCta, Footer, Marquee, ServicesMenu, Steps, WhatsAppFab } from './Sections';
import { useSchedule } from './useSchedule';

function scrollToBooking() {
  document.getElementById('agendamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Site() {
  const api = useApi();
  const { data, ctx, error, refresh } = useSchedule(api);
  const [sel, setSel] = useState<Selection>({ serviceId: null, day: null, startMin: null });
  const [calMonth, setCalMonth] = useState(() => shopNow().day.slice(0, 7));

  useEffect(() => {
    document.title = 'Khalifa Barber Shop — Barbearia em Modelo, SC | Agende online';
  }, []);

  const services = data?.services ?? null;

  const bookService = useCallback((id: string) => {
    setSel((p) => ({ ...p, serviceId: id }));
    scrollToBooking();
  }, []);

  // Card "Próximo horário livre" usa o serviço mais rápido de corte (ou o primeiro).
  const next = useMemo(() => {
    if (!ctx || !services?.length) return null;
    const ref = services.find((s) => /social/i.test(s.name)) ?? [...services].sort((a, b) => a.durationMin - b.durationMin)[0];
    const n = nextFree(ctx, ref.durationMin);
    if (!n) return { label: 'Consulte', onClick: scrollToBooking };
    const d = n.day === ctx.now.day ? 'Hoje' : n.day === addDays(ctx.now.day, 1) ? 'Amanhã' : `${WEEKDAYS_SHORT[weekdayOf(n.day)]} ${fmtShort(n.day)}`;
    return {
      label: `${d}, ${hm(n.startMin)}`,
      onClick: () => {
        setSel({ serviceId: ref.id, day: n.day, startMin: n.startMin });
        setCalMonth(n.day.slice(0, 7));
        scrollToBooking();
      },
    };
  }, [ctx, services]);

  const hoursSummary = useMemo(() => {
    if (!data) return '8h30–11h30 · 13h–20h';
    // Expediente do primeiro dia útil da semana (terça → sábado → domingo/segunda).
    const wd = [2, 3, 4, 5, 6, 0, 1].find((d) => data.hours.some((h) => h.weekday === d));
    const w = data.hours.filter((h) => h.weekday === wd).sort((a, b) => a.startMin - b.startMin);
    return w.length ? w.map((x) => `${hmLabel(x.startMin)}–${hmLabel(x.endMin)}`).join(' · ') : 'Consulte';
  }, [data]);

  return (
    <>
      <a href="#agendamento" className="skip-link">
        Ir para o agendamento
      </a>
      <Header />
      <main>
        <Hero nextFree={next} hoursSummary={hoursSummary} />
        <Marquee items={services?.map((s) => s.name) ?? ['Corte degradê', 'Corte social', 'Barba', 'Sobrancelha']} />
        <ServicesMenu services={services} onBook={bookService} />
        <Steps />
        <About />
        <Booking api={api} services={services} ctx={ctx} loadError={error} sel={sel} setSel={setSel} calMonth={calMonth} setCalMonth={setCalMonth} onBooked={() => void refresh()} />
        <Contact hours={data?.hours ?? null} todayWeekday={weekdayOf(shopNow().day)} />
        <FinalCta />
      </main>
      <Footer />
      <WhatsAppFab />
      {api.mode === 'demo' ? <DemoBanner /> : null}
    </>
  );
}

function DemoBanner() {
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem('khalifa_demo_banner') === '0';
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  return (
    <div className="demo-banner" role="note">
      <span>Modo demonstração: agendamentos ficam salvos só neste navegador até o Supabase ser conectado.</span>
      <button
        aria-label="Fechar aviso"
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem('khalifa_demo_banner', '0');
          } catch {
            /* ignore */
          }
        }}
      >
        <CloseIcon width={12} height={12} />
      </button>
    </div>
  );
}

export default function SitePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#070826' }} />}>
      <Site />
    </Suspense>
  );
}
