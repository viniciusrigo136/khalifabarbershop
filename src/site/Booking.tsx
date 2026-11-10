import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { SHOP, waLink } from '../config';
import { Dialog } from '../components/Dialog';
import { CheckIcon, ChevronIcon } from '../components/Icons';
import { Reveal } from '../components/Reveal';
import { ApiError, type Api, type BookingResult, type DayKey, type Service } from '../data/types';
import { MONTHS, WEEKDAYS_SHORT, brl, brlShort, durLabel, firstName, fmtLong, hm, parseKey, toKey } from '../lib/format';
import { digits, isValidPhone, maskPhone } from '../lib/phone';
import { freeSlots, isClosed, lastBookableDay, type ScheduleCtx } from '../lib/schedule';

export interface Selection {
  serviceId: string | null;
  day: DayKey | null;
  startMin: number | null;
}

interface Props {
  api: Api;
  services: Service[] | null;
  ctx: ScheduleCtx | null;
  loadError: boolean;
  sel: Selection;
  setSel: (s: Selection | ((p: Selection) => Selection)) => void;
  calMonth: string; // 'YYYY-MM'
  setCalMonth: (m: string) => void;
  onBooked: () => void;
}

const ERRORS: Record<string, string> = {
  SLOT_TAKEN: 'Esse horário acabou de ser ocupado. Escolha outro — seus dados foram mantidos.',
  TOO_SOON: 'Esse horário já passou do limite de antecedência. Escolha um mais tarde.',
  CLOSED: 'A barbearia não atende nesse horário. Escolha outro.',
  OUT_OF_RANGE: 'Essa data não está disponível para agendamento. Escolha outra.',
  INVALID_SERVICE: 'Esse serviço não está mais disponível. Escolha outro.',
  INVALID_NAME: 'Informe seu nome.',
  INVALID_PHONE: 'Confira o WhatsApp com DDD.',
  TOO_MANY: `Esse número já tem reservas em aberto. Para marcar mais, chame no WhatsApp ${SHOP.whatsappLabel}.`,
  NETWORK: 'Sem conexão. Verifique a internet e tente de novo.',
};

const springy = { type: 'spring', stiffness: 500, damping: 38 } as const;

/* Preço que "conta" até o novo valor. */
function AnimatedPrice({ cents }: { cents: number }) {
  const mv = useMotionValue(cents);
  const text = useTransform(mv, (v) => brl(Math.round(v)));
  useEffect(() => {
    const c = animate(mv, cents, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [cents, mv]);
  return <motion.output aria-live="polite">{text}</motion.output>;
}

/* Valor do resumo que troca com um leve deslize. */
function Swap({ value }: { value: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.dd key={value} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
        {value}
      </motion.dd>
    </AnimatePresence>
  );
}

function StepBadge({ n, done }: { n: number; done: boolean }) {
  return (
    <span className="step-badge" aria-hidden="true">
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.span key="ok" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={springy} style={{ display: 'grid' }}>
            <CheckIcon />
          </motion.span>
        ) : (
          <motion.span key="n" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            {n}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function Booking({ api, services, ctx, loadError, sel, setSel, calMonth, setCalMonth, onBooked }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errs, setErrs] = useState<{ name?: string; phone?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<(BookingResult & { name: string }) | null>(null);
  const [monthDir, setMonthDir] = useState(1);
  const slotsRef = useRef<HTMLDivElement>(null);

  const svc = services?.find((s) => s.id === sel.serviceId) ?? null;

  // Se o horário escolhido deixar de caber (troca de serviço ou alguém reservou), desmarca.
  useEffect(() => {
    if (!ctx || !svc || !sel.day || sel.startMin == null) return;
    if (!freeSlots(ctx, sel.day, svc.durationMin).includes(sel.startMin)) setSel((p) => ({ ...p, startMin: null }));
  }, [ctx, svc, sel.day, sel.startMin, setSel]);

  /* ----- Calendário ----- */
  const today = ctx?.now.day ?? null;
  const lastDay = ctx ? lastBookableDay(ctx) : null;
  const [cy, cm] = calMonth.split('-').map(Number);
  const firstMonth = today?.slice(0, 7) ?? calMonth;
  const lastMonth = lastDay?.slice(0, 7) ?? calMonth;

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cy, cm - 1, 1));
    const lead = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
    const out: { key: string; day: number | null; enabled: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < lead; i++) out.push({ key: `b${i}`, day: null, enabled: false, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const k = toKey(cy, cm - 1, d);
      let enabled = false;
      if (ctx && today && lastDay && k >= today && k <= lastDay && !isClosed(ctx, k)) {
        enabled = svc ? freeSlots(ctx, k, svc.durationMin).length > 0 : true;
      }
      out.push({ key: k, day: d, enabled, isToday: k === today });
    }
    return out;
  }, [cy, cm, ctx, today, lastDay, svc]);

  const shiftMonth = (dir: 1 | -1) => {
    const d = new Date(Date.UTC(cy, cm - 1 + dir, 1));
    setMonthDir(dir);
    setCalMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };

  /* ----- Horários ----- */
  const slots = useMemo(() => (ctx && svc && sel.day ? freeSlots(ctx, sel.day, svc.durationMin) : []), [ctx, svc, sel.day]);
  const groups = [
    { label: 'Manhã', items: slots.filter((t) => t < 720) },
    { label: 'Tarde', items: slots.filter((t) => t >= 720) },
  ].filter((g) => g.items.length);

  let hint = '';
  if (loadError) hint = 'Não foi possível carregar a agenda. Verifique a conexão e recarregue a página.';
  else if (!ctx) hint = 'Carregando horários…';
  else if (!svc) hint = 'Escolha um serviço para ver os horários livres.';
  else if (!sel.day) hint = 'Agora escolha um dia no calendário.';
  else if (!slots.length) hint = `Sem horários livres nesse dia para ${svc.name.toLowerCase()}. Tente outra data.`;

  const pickDay = (k: DayKey) => {
    setSel((p) => ({ ...p, day: k }));
    setErrs((e) => ({ ...e, form: undefined }));
    // No celular, leva o cliente até os horários.
    if (window.matchMedia('(max-width: 640px)').matches) {
      window.setTimeout(() => slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  };

  /* ----- Envio ----- */
  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errs = {};
    if (name.trim().length < 2) next.name = 'Informe seu nome.';
    if (!isValidPhone(phone)) next.phone = 'WhatsApp com DDD, ex.: (49) 99999-9999';
    if (!svc) next.form = 'Escolha um serviço.';
    else if (!sel.day) next.form = 'Escolha o dia.';
    else if (sel.startMin == null) next.form = 'Escolha um horário.';
    setErrs(next);
    if (Object.keys(next).length || !svc || !sel.day || sel.startMin == null) return;

    setBusy(true);
    try {
      const r = await api.book({ serviceId: svc.id, day: sel.day, startMin: sel.startMin, name: name.trim(), phone: digits(phone) });
      setSuccess({ ...r, name: name.trim() });
      setSel({ serviceId: null, day: null, startMin: null });
      setName('');
      setPhone('');
      onBooked();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'UNKNOWN';
      if (code === 'INVALID_NAME') setErrs({ name: ERRORS[code] });
      else if (code === 'INVALID_PHONE') setErrs({ phone: ERRORS[code] });
      else setErrs({ form: ERRORS[code] ?? 'Não foi possível concluir o agendamento. Tente de novo em instantes.' });
      if (code === 'SLOT_TAKEN' || code === 'TOO_SOON') {
        setSel((p) => ({ ...p, startMin: null }));
        onBooked(); // recarrega horários ocupados
      }
    } finally {
      setBusy(false);
    }
  }

  // Mantém o conteúdo durante a animação de saída do diálogo.
  const lastSuccess = useRef(success);
  if (success) lastSuccess.current = success;
  const shown = lastSuccess.current;
  const when = shown ? `${fmtLong(shown.day)} às ${hm(shown.startMin)}` : '';

  return (
    <section id="agendamento" className="section booking" aria-labelledby="agendamento-title">
      <div className="container" style={{ maxWidth: 1180 }}>
        <Reveal className="booking__head">
          <span className="eyebrow">Agendamento</span>
          <h2 id="agendamento-title" className="h2">
            Reserve sua cadeira
          </h2>
          <p className="lead">Três passos. Sem cadastro, sem senha.</p>
        </Reveal>

        <form className="booking__layout" onSubmit={submit} noValidate>
          <div className="booking__steps">
            {/* 1. Serviço */}
            <fieldset className={`panel${svc ? ' is-done' : ''}`} style={{ margin: 0 }}>
              <legend className="sr-only">Passo 1: escolha o serviço</legend>
              <div className="panel__title" aria-hidden="true">
                <StepBadge n={1} done={!!svc} />
                Escolha o serviço
              </div>
              <div className="svc-grid">
                {services
                  ? services.map((s) => {
                      const on = sel.serviceId === s.id;
                      return (
                        <motion.button
                          type="button"
                          key={s.id}
                          className="choice"
                          aria-pressed={on}
                          onClick={() => {
                            setSel((p) => ({ ...p, serviceId: s.id }));
                            setErrs((e) => ({ ...e, form: undefined }));
                          }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {on ? <motion.span layoutId="svc-bg" className="choice__bg" transition={springy} /> : null}
                          <strong>{s.name}</strong>
                          <small>
                            {brlShort(s.priceCents)} · {durLabel(s.durationMin)}
                          </small>
                        </motion.button>
                      );
                    })
                  : [0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 66 }} />)}
              </div>
            </fieldset>

            {/* 2. Dia e horário */}
            <fieldset className={`panel${sel.startMin != null ? ' is-done' : ''}`} style={{ margin: 0 }}>
              <legend className="sr-only">Passo 2: dia e horário</legend>
              <div className="panel__title" aria-hidden="true">
                <StepBadge n={2} done={sel.startMin != null} />
                Dia e horário
              </div>
              <div className="datetime">
                <div className="cal">
                  <div className="cal__nav">
                    <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} disabled={calMonth <= firstMonth} aria-label="Mês anterior">
                      <ChevronIcon dir="left" />
                    </button>
                    <span aria-live="polite">
                      {MONTHS[cm - 1]} {cy}
                    </span>
                    <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} disabled={calMonth >= lastMonth} aria-label="Próximo mês">
                      <ChevronIcon />
                    </button>
                  </div>
                  <div className="cal__week" aria-hidden="true">
                    {WEEKDAYS_SHORT.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                  <div className="cal__viewport">
                    <AnimatePresence mode="popLayout" initial={false} custom={monthDir}>
                      <motion.div
                        key={calMonth}
                        className="cal__days"
                        custom={monthDir}
                        variants={{ enter: (d: number) => ({ x: d * 40, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: d * -40, opacity: 0 }) }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {cells.map((c) =>
                          c.day === null ? (
                            <span key={c.key} className="day is-blank" aria-hidden="true" />
                          ) : (
                            <button
                              type="button"
                              key={c.key}
                              className={`day${c.isToday ? ' is-today' : ''}`}
                              disabled={!c.enabled}
                              aria-pressed={sel.day === c.key}
                              aria-label={`${fmtLong(c.key)}${c.enabled ? '' : ' — indisponível'}`}
                              onClick={() => pickDay(c.key)}
                            >
                              {sel.day === c.key ? <motion.span layoutId="day-bg" className="day__bg" transition={springy} /> : null}
                              {c.day}
                            </button>
                          ),
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <span className="cal__note">Fechado domingo e segunda.</span>
                </div>

                <div className="slots" ref={slotsRef} aria-live="polite">
                  <AnimatePresence mode="wait" initial={false}>
                    {hint ? (
                      <motion.div key={`hint-${hint}`} className="hint" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                        {hint}
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`${sel.day}-${svc?.id}`}
                        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.015 } } }}
                      >
                        <span className="label" style={{ letterSpacing: '.08em', textTransform: 'none' }}>
                          {sel.day ? fmtLong(sel.day) : ''}
                        </span>
                        {groups.map((g) => (
                          <div className="slot-group" key={g.label} role="group" aria-label={g.label}>
                            <span className="label">{g.label}</span>
                            <div className="slot-grid">
                              {g.items.map((t) => {
                                const on = sel.startMin === t;
                                return (
                                  <motion.button
                                    type="button"
                                    key={t}
                                    className="slot"
                                    aria-pressed={on}
                                    onClick={() => {
                                      setSel((p) => ({ ...p, startMin: t }));
                                      setErrs((e) => ({ ...e, form: undefined }));
                                    }}
                                    variants={{ hidden: { opacity: 0, scale: 0.85 }, show: { opacity: 1, scale: 1 } }}
                                    whileTap={{ scale: 0.92 }}
                                  >
                                    {on ? <motion.span layoutId="slot-bg" className="slot__bg" transition={springy} /> : null}
                                    {hm(t)}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </fieldset>

            {/* 3. Dados */}
            <fieldset className={`panel${name.trim().length >= 2 && isValidPhone(phone) ? ' is-done' : ''}`} style={{ margin: 0 }}>
              <legend className="sr-only">Passo 3: seus dados</legend>
              <div className="panel__title" aria-hidden="true">
                <StepBadge n={3} done={name.trim().length >= 2 && isValidPhone(phone)} />
                Seus dados
              </div>
              <div className="fields">
                <label className="field">
                  Nome
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrs((x) => ({ ...x, name: undefined }));
                    }}
                    placeholder="Como podemos te chamar?"
                    maxLength={60}
                    autoComplete="name"
                    aria-invalid={!!errs.name}
                    aria-describedby="err-name"
                  />
                  <span id="err-name" className="field__err">
                    {errs.name}
                  </span>
                </label>
                <label className="field">
                  WhatsApp
                  <input
                    className="input"
                    value={phone}
                    onChange={(e) => {
                      setPhone(maskPhone(e.target.value));
                      setErrs((x) => ({ ...x, phone: undefined }));
                    }}
                    placeholder="(49) 99999-9999"
                    inputMode="tel"
                    autoComplete="tel-national"
                    aria-invalid={!!errs.phone}
                    aria-describedby="err-phone"
                  />
                  <span id="err-phone" className="field__err">
                    {errs.phone}
                  </span>
                </label>
              </div>
            </fieldset>
          </div>

          {/* Resumo */}
          <aside className="summary" aria-label="Resumo do agendamento">
            <span className="eyebrow" style={{ fontSize: 12, letterSpacing: '.2em' }}>
              Resumo
            </span>
            <dl>
              <div>
                <dt>Serviço</dt>
                <Swap value={svc?.name ?? '—'} />
              </div>
              <div>
                <dt>Dia</dt>
                <Swap value={sel.day ? fmtLong(sel.day) : '—'} />
              </div>
              <div>
                <dt>Horário</dt>
                <Swap value={svc && sel.startMin != null ? `${hm(sel.startMin)} – ${hm(sel.startMin + svc.durationMin)}` : '—'} />
              </div>
              <div>
                <dt>Duração</dt>
                <Swap value={svc ? durLabel(svc.durationMin) : '—'} />
              </div>
            </dl>
            <div className="summary__total">
              <span>Total</span>
              <AnimatedPrice cents={svc?.priceCents ?? 0} />
            </div>
            <motion.button type="submit" className="btn btn--gold btn--block" disabled={busy || !ctx} whileHover={busy ? undefined : { y: -1 }} whileTap={busy ? undefined : { scale: 0.98 }}>
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Confirmando…
                </>
              ) : (
                'Confirmar agendamento'
              )}
            </motion.button>
            <AnimatePresence>
              {errs.form ? (
                <motion.div role="alert" className="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  {errs.form}
                </motion.div>
              ) : null}
            </AnimatePresence>
            <p className="summary__note">
              Pagamento na barbearia: {SHOP.payments}. Ao confirmar, você concorda com a nossa <Link to="/privacidade">política de privacidade</Link>.
            </p>
          </aside>
        </form>
      </div>

      <Dialog open={!!success} onClose={() => setSuccess(null)} className="dialog--success">
        {(titleId) =>
          shown ? (
            <>
              <motion.div className="success-check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.35, ease: 'easeOut' }} />
                </svg>
              </motion.div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3 id={titleId} className="serif" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.05 }}>
                  Horário agendado!
                </h3>
                <p style={{ color: 'var(--muted)' }}>Te esperamos, {firstName(shown.name)}.</p>
              </div>
              <dl className="receipt" style={{ margin: 0 }}>
                <div>
                  <dt>Serviço</dt>
                  <dd>{shown.serviceName}</dd>
                </div>
                <div>
                  <dt>Quando</dt>
                  <dd>{when}</dd>
                </div>
                <div>
                  <dt>Duração</dt>
                  <dd>{durLabel(shown.durationMin)}</dd>
                </div>
                <div>
                  <dt>Valor</dt>
                  <dd style={{ color: 'var(--gold)', fontWeight: 700 }}>{brl(shown.priceCents)}</dd>
                </div>
                <div>
                  <dt>Local</dt>
                  <dd>{SHOP.street}, Modelo</dd>
                </div>
              </dl>
              <a
                className="btn btn--wa btn--block"
                style={{ borderRadius: 12 }}
                href={waLink(`Olá! Acabei de agendar ${shown.serviceName} para ${when}. Nome: ${shown.name}`)}
                target="_blank"
                rel="noopener noreferrer"
                data-autofocus
              >
                Avisar a barbearia no WhatsApp
              </a>
              <button className="link-btn" onClick={() => setSuccess(null)}>
                Fechar
              </button>
            </>
          ) : null
        }
      </Dialog>
    </section>
  );
}

export const monthOf = (k: DayKey) => k.slice(0, 7);
export const weekdayName = (k: DayKey) => WEEKDAYS_SHORT[parseKey(k).getUTCDay()];
