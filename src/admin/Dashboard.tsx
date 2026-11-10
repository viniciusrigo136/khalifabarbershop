import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronIcon } from '../components/Icons';
import { ApiError, type Api, type Appointment, type Block, type Payment, type PublicData, type Service } from '../data/types';
import { addDays, brl, cap, fmtFull, fmtLong, fmtShort, hm, shopNow, weekdayOf } from '../lib/format';
import { maskPhone, toWhatsApp } from '../lib/phone';
import { waLink } from '../config';
import { hoursTable } from '../site/Sections';
import { AdminModal, type ModalState } from './AdminModal';

type Tab = 'agenda' | 'fin' | 'svc' | 'cfg';
type Period = 'hoje' | 'semana' | 'mes' | 'mes-ant';
export const METHOD_LABEL = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão' } as const;

function Count({ value, money }: { value: number; money?: boolean }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => (money ? brl(Math.round(v)) : String(Math.round(v))));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.8, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [value, mv]);
  return <motion.strong className={money ? 'is-gold' : undefined}>{text}</motion.strong>;
}

function periodRange(p: Period, today: string): [string, string] {
  if (p === 'hoje') return [today, today];
  if (p === 'semana') {
    const start = addDays(today, -((weekdayOf(today) + 6) % 7)); // segunda
    return [start, addDays(start, 6)];
  }
  if (p === 'mes') return [`${today.slice(0, 7)}-01`, today];
  const firstThis = `${today.slice(0, 7)}-01`;
  const lastPrev = addDays(firstThis, -1);
  return [`${lastPrev.slice(0, 7)}-01`, lastPrev];
}

export default function Dashboard({ api }: { api: Api }) {
  const [tab, setTab] = useState<Tab>('agenda');
  const [today, setToday] = useState(() => shopNow().day);
  const [day, setDay] = useState(today);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [period, setPeriod] = useState<Period>('mes');
  const [reload, setReload] = useState(0);
  const bump = useCallback(() => setReload((r) => r + 1), []);

  const [pub, setPub] = useState<PublicData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [dayAppts, setDayAppts] = useState<Appointment[] | null>(null);
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [results, setResults] = useState<Appointment[] | null>(null);
  const [monthPays, setMonthPays] = useState<Payment[]>([]);
  const [periodPays, setPeriodPays] = useState<Payment[] | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((text: string, error = false) => {
    setToast({ text, error });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  const fail = useCallback(
    (e: unknown) => {
      const code = e instanceof ApiError ? e.code : '';
      notify(
        code === 'SLOT_TAKEN'
          ? 'Conflito com outro agendamento nesse horário.'
          : code === 'NOT_PENDING'
            ? 'Esse atendimento já foi finalizado.'
            : code === 'NETWORK'
              ? 'Sem conexão. Tente de novo.'
              : 'Não foi possível salvar. Tente de novo.',
        true,
      );
    },
    [notify],
  );

  // Atualiza "hoje" a cada minuto e escuta novos agendamentos em tempo real.
  useEffect(() => {
    const id = window.setInterval(() => setToday(shopNow().day), 60_000);
    const unsub = api.subscribeAppointments(bump);
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [api, bump]);

  // Carregamentos independentes em paralelo.
  useEffect(() => {
    let alive = true;
    const [m0] = periodRange('mes', today);
    const [w0] = periodRange('semana', today);
    const from = w0 < m0 ? w0 : m0;
    Promise.all([api.getPublicData(), api.listServices(), api.listAppointments(today, today), api.listPayments(from, today), api.listBlocks(today)])
      .then(([p, s, ta, mp, b]) => {
        if (!alive) return;
        setPub(p);
        setServices(s);
        setTodayAppts(ta);
        setMonthPays(mp);
        setBlocks(b);
      })
      .catch(fail);
    return () => {
      alive = false;
    };
  }, [api, today, reload, fail]);

  useEffect(() => {
    let alive = true;
    setDayAppts(null);
    api
      .listAppointments(day, day)
      .then((a) => alive && setDayAppts(a))
      .catch(fail);
    return () => {
      alive = false;
    };
  }, [api, day, reload, fail]);

  useEffect(() => {
    const q = deferredQuery.trim();
    if (q.length < 2) return setResults(null);
    let alive = true;
    api
      .searchAppointments(q, today)
      .then((r) => alive && setResults(r))
      .catch(fail);
    return () => {
      alive = false;
    };
  }, [api, deferredQuery, today, reload, fail]);

  useEffect(() => {
    let alive = true;
    const [a, b] = periodRange(period, today);
    setPeriodPays(null);
    api
      .listPayments(a, b)
      .then((p) => alive && setPeriodPays(p))
      .catch(fail);
    return () => {
      alive = false;
    };
  }, [api, period, today, reload, fail]);

  /* ----- Indicadores ----- */
  const stats = useMemo(() => {
    const sum = (arr: Payment[]) => arr.reduce((t, p) => t + p.amountCents, 0);
    const [w0, w1] = periodRange('semana', today);
    const [m0] = periodRange('mes', today);
    const pToday = monthPays.filter((p) => p.paidOn === today);
    const pWeek = monthPays.filter((p) => p.paidOn >= w0 && p.paidOn <= w1);
    const pMonth = monthPays.filter((p) => p.paidOn >= m0);
    return {
      pendingToday: todayAppts.filter((a) => a.status === 'booked').length,
      doneToday: pToday.length,
      doneMonth: pMonth.length,
      today: sum(pToday),
      week: sum(pWeek),
      month: sum(pMonth),
    };
  }, [monthPays, todayAppts, today]);

  const now = shopNow();
  const list = results ?? dayAppts;
  const searching = results !== null;

  /* ----- Ações ----- */
  const act = useCallback(
    async (fn: () => Promise<unknown>, ok: string) => {
      try {
        await fn();
        notify(ok);
        setModal(null);
        bump();
      } catch (e) {
        fail(e);
        throw e;
      }
    },
    [notify, bump, fail],
  );

  const tabs: [Tab, string][] = [
    ['agenda', 'Agenda'],
    ['fin', 'Financeiro'],
    ['svc', 'Serviços'],
    ['cfg', 'Horários e folgas'],
  ];

  return (
    <main className="adm">
      <div className="adm__wrap">
        <div className="adm__top">
          <div className="adm__brand">
            <img src="/img/logo.png" alt="" width={66} height={48} />
            <div>
              <strong>Painel</strong>
              <span>{cap(fmtLong(today))}</span>
            </div>
          </div>
          <div className="adm__actions">
            <button className="adm-btn" onClick={() => setModal({ type: 'novo', day })}>
              + Novo agendamento
            </button>
            <button className="adm-btn adm-btn--gold" onClick={() => setModal({ type: 'avulso' })}>
              Atendimento avulso
            </button>
            <Link to="/" className="adm-btn adm-btn--plain">
              Ver site
            </Link>
            <button className="adm-btn adm-btn--plain" onClick={() => void api.signOut()}>
              Sair
            </button>
          </div>
        </div>

        <div className="stats">
          <div className="card">
            <span>Agendados hoje</span>
            <Count value={stats.pendingToday} />
          </div>
          <div className="card">
            <span>Finalizados hoje</span>
            <Count value={stats.doneToday} />
          </div>
          <div className="card">
            <span>Finalizados no mês</span>
            <Count value={stats.doneMonth} />
          </div>
          <div className="card">
            <span>Recebido hoje</span>
            <Count value={stats.today} money />
          </div>
          <div className="card">
            <span>Recebido na semana</span>
            <Count value={stats.week} money />
          </div>
          <div className="card">
            <span>Recebido no mês</span>
            <Count value={stats.month} money />
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label="Seções do painel">
          {tabs.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className="tab" onClick={() => setTab(id)}>
              {tab === id ? <motion.span layoutId="tab-bg" className="tab__bg" transition={{ type: 'spring', stiffness: 500, damping: 38 }} /> : null}
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
            {tab === 'agenda' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="toolbar">
                  <div className="daynav">
                    <button className="icon-btn" aria-label="Dia anterior" onClick={() => setDay((d) => addDays(d, -1))}>
                      <ChevronIcon dir="left" />
                    </button>
                    <div className="daynav__label">
                      <strong>{searching ? 'Resultados da busca' : `${day === today ? 'Hoje · ' : ''}${day === today ? fmtLong(day) : cap(fmtLong(day))}`}</strong>
                      <span>{list ? `${list.filter((a) => a.status === 'booked').length} pendente(s) · ${list.length} no total` : 'Carregando…'}</span>
                    </div>
                    <button className="icon-btn" aria-label="Próximo dia" onClick={() => setDay((d) => addDays(d, 1))}>
                      <ChevronIcon />
                    </button>
                    <button
                      className="adm-btn adm-btn--sm"
                      onClick={() => {
                        setDay(today);
                        setQuery('');
                      }}
                    >
                      Hoje
                    </button>
                    <input type="date" className="search" style={{ minWidth: 0 }} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Ir para a data" />
                  </div>
                  <input className="search" type="search" placeholder="Buscar nome ou telefone…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar agendamentos futuros" />
                </div>

                {list && list.length === 0 ? <div className="empty">{searching ? 'Nenhum agendamento futuro encontrado.' : 'Nenhum atendimento neste dia. Use “+ Novo agendamento” para encaixar alguém.'}</div> : null}

                <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <AnimatePresence initial={false}>
                    {(list ?? []).map((a) => {
                      const past = a.day < now.day || (a.day === now.day && a.startMin + a.durationMin < now.minutes);
                      const done = a.status === 'done';
                      return (
                        <motion.div
                          key={a.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: done ? 0.7 : 1, y: 0 }}
                          exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                          className={`appt${done ? ' is-done' : past ? ' is-past' : ''}`}
                        >
                          <div className="appt__time">
                            <strong>{hm(a.startMin)}</strong>
                            <small>
                              {searching ? `${fmtShort(a.day)} · ` : ''}até {hm(a.startMin + a.durationMin)}
                            </small>
                          </div>
                          <div className="appt__who">
                            <strong>{a.clientName}</strong>
                            <small>{a.clientPhone ? maskPhone(a.clientPhone) : 'sem telefone'}</small>
                          </div>
                          <div>
                            <span style={{ fontSize: 15 }}>{a.serviceName}</span>
                            <small>
                              {brl(a.priceCents)} · {a.origin === 'site' ? 'pelo site' : 'manual'} {done ? <span className="tag">finalizado</span> : null}
                            </small>
                          </div>
                          <div className="appt__acts">
                            {!done ? (
                              <>
                                <button className="adm-btn adm-btn--gold adm-btn--sm" onClick={() => setModal({ type: 'finish', appt: a })}>
                                  Finalizar
                                </button>
                                {a.clientPhone ? (
                                  <a
                                    className="appt__wa"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href={waLink(`Olá ${a.clientName.split(' ')[0]}! Confirmando seu horário na Khalifa Barber Shop: ${a.serviceName}, ${fmtLong(a.day)} às ${hm(a.startMin)}.`, toWhatsApp(a.clientPhone))}
                                  >
                                    WhatsApp
                                  </a>
                                ) : null}
                                <button className="adm-btn adm-btn--danger adm-btn--sm" onClick={() => setModal({ type: 'del', appt: a })}>
                                  Cancelar
                                </button>
                              </>
                            ) : null}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </div>
            ) : null}

            {tab === 'fin' ? <FinanceTab pays={periodPays} period={period} setPeriod={setPeriod} today={today} /> : null}

            {tab === 'svc' ? <ServicesTab api={api} services={services} onSaved={bump} notify={notify} fail={fail} /> : null}

            {tab === 'cfg' ? <ScheduleTab api={api} pub={pub} blocks={blocks} today={today} onChanged={bump} notify={notify} fail={fail} /> : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <AdminModal state={modal} onClose={() => setModal(null)} api={api} pub={pub} services={services} act={act} />

      <AnimatePresence>
        {toast ? (
          <motion.div
            role="status"
            className={`toast${toast.error ? ' is-error' : ''}`}
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
          >
            {toast.text}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

/* ================= Financeiro ================= */
function FinanceTab({ pays, period, setPeriod, today }: { pays: Payment[] | null; period: Period; setPeriod: (p: Period) => void; today: string }) {
  const list = pays ?? [];
  const total = list.reduce((t, p) => t + p.amountCents, 0);
  const by = (m: keyof typeof METHOD_LABEL) => list.filter((p) => p.method === m).reduce((t, p) => t + p.amountCents, 0);
  const [a, b] = periodRange(period, today);

  function exportCsv() {
    const esc = (v: string) => {
      let s = v;
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // evita injeção de fórmula no Excel
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = list.map((p) => [fmtFull(p.paidOn), p.clientName, p.serviceName, METHOD_LABEL[p.method], (p.amountCents / 100).toFixed(2).replace('.', ',')].map(esc).join(';'));
    const csv = ['Data;Cliente;Serviço;Pagamento;Valor', ...rows].join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const el = document.createElement('a');
    el.href = url;
    el.download = `khalifa-financeiro-${a}_${b}.csv`;
    el.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const methods = (['pix', 'dinheiro', 'cartao'] as const).map((m) => ({ m, v: by(m) }));
  const max = Math.max(1, ...methods.map((x) => x.v));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="toolbar">
        <div className="periods" role="group" aria-label="Período">
          {(
            [
              ['hoje', 'Hoje'],
              ['semana', 'Semana'],
              ['mes', 'Mês'],
              ['mes-ant', 'Mês anterior'],
            ] as [Period, string][]
          ).map(([id, label]) => (
            <button key={id} className="chip" aria-pressed={period === id} onClick={() => setPeriod(id)}>
              {label}
            </button>
          ))}
        </div>
        <button className="adm-btn adm-btn--sm" onClick={exportCsv} disabled={!list.length}>
          Exportar planilha (CSV)
        </button>
      </div>
      <div className="stats">
        <div className="card">
          <span>Total recebido</span>
          <Count value={total} money />
        </div>
        <div className="card">
          <span>Atendimentos</span>
          <Count value={list.length} />
        </div>
        <div className="card">
          <span>Ticket médio</span>
          <Count value={list.length ? Math.round(total / list.length) : 0} money />
        </div>
      </div>
      <div className="bars" aria-label="Recebido por forma de pagamento">
        {methods.map(({ m, v }) => (
          <div className="bar" key={m}>
            <span>{METHOD_LABEL[m]}</span>
            <div className="bar__track">
              <motion.div className="bar__fill" initial={{ scaleX: 0 }} animate={{ scaleX: v / max }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <span>{brl(v)}</span>
          </div>
        ))}
      </div>
      <div className="table">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Serviço</th>
              <th>Pagamento</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td style={{ color: 'var(--muted)' }}>{fmtFull(p.paidOn)}</td>
                <td>{p.clientName}</td>
                <td>{p.serviceName}</td>
                <td style={{ color: 'var(--muted)' }}>{METHOD_LABEL[p.method]}</td>
                <td className="num">{brl(p.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pays && !list.length ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--faint)' }}>Nenhum recebimento neste período.</div> : null}
      </div>
    </div>
  );
}

/* ================= Serviços ================= */
function ServicesTab({ api, services, onSaved, notify, fail }: { api: Api; services: Service[]; onSaved: () => void; notify: (t: string) => void; fail: (e: unknown) => void }) {
  const [drafts, setDrafts] = useState<Record<string, Service>>({});
  useEffect(() => setDrafts({}), [services]);

  const get = (s: Service) => drafts[s.id] ?? s;
  const edit = (s: Service, patch: Partial<Service>) => setDrafts((d) => ({ ...d, [s.id]: { ...get(s), ...patch } }));

  async function save(s: Service) {
    const d = get(s);
    if (!d.name.trim()) return notify('O serviço precisa de um nome.');
    if (!(d.durationMin >= 5 && d.durationMin % 5 === 0)) return notify('Duração em múltiplos de 5 minutos.');
    try {
      await api.saveService({ ...d, name: d.name.trim() });
      notify('Serviço salvo');
      onSaved();
    } catch (e) {
      fail(e);
    }
  }
  async function add() {
    try {
      await api.saveService({ name: 'Novo serviço', description: '', priceCents: 3000, durationMin: 30, active: false, sort: services.length + 1 });
      notify('Serviço criado (inativo). Ajuste e ative.');
      onSaved();
    } catch (e) {
      fail(e);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ color: 'var(--faint)', fontSize: 14 }}>Alterações valem para novos agendamentos. Reservas já feitas mantêm preço e duração originais.</p>
      {services.map((s) => {
        const d = get(s);
        const dirty = !!drafts[s.id];
        return (
          <motion.div layout key={s.id} className={`svc-row${d.active ? '' : ' is-off'}`}>
            <input className="input" value={d.name} maxLength={60} onChange={(e) => edit(s, { name: e.target.value })} aria-label="Nome do serviço" />
            <input className="input" value={d.description} maxLength={160} placeholder="Descrição curta" onChange={(e) => edit(s, { description: e.target.value })} aria-label="Descrição" />
            <label>
              R$
              <input
                className="input"
                type="number"
                min={0}
                step={1}
                value={d.priceCents / 100}
                onChange={(e) => edit(s, { priceCents: Math.max(0, Math.round(Number(e.target.value) * 100) || 0) })}
                aria-label="Preço"
              />
            </label>
            <label>
              <input className="input" type="number" min={5} step={5} value={d.durationMin} onChange={(e) => edit(s, { durationMin: Number(e.target.value) || 0 })} aria-label="Duração em minutos" />
              min
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="toggle" aria-pressed={d.active} onClick={() => edit(s, { active: !d.active })}>
                {d.active ? 'Ativo' : 'Inativo'}
              </button>
              <button className="adm-btn adm-btn--gold adm-btn--sm" disabled={!dirty} onClick={() => void save(s)}>
                Salvar
              </button>
            </div>
          </motion.div>
        );
      })}
      <button className="adm-btn" style={{ alignSelf: 'flex-start' }} onClick={() => void add()}>
        + Adicionar serviço
      </button>
    </div>
  );
}

/* ================= Horários e folgas ================= */
function ScheduleTab({
  api,
  pub,
  blocks,
  today,
  onChanged,
  notify,
  fail,
}: {
  api: Api;
  pub: PublicData | null;
  blocks: Block[];
  today: string;
  onChanged: () => void;
  notify: (t: string, e?: boolean) => void;
  fail: (e: unknown) => void;
}) {
  const [bDay, setBDay] = useState(today);
  const [bStart, setBStart] = useState('');
  const [bEnd, setBEnd] = useState('');
  const [oDay, setODay] = useState('');
  const [err, setErr] = useState('');

  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };

  async function addBlock() {
    setErr('');
    if (!bDay || !bStart || !bEnd) return setErr('Preencha data, início e fim.');
    const s = toMin(bStart);
    const e = toMin(bEnd);
    if (e <= s) return setErr('O fim precisa ser depois do início.');
    try {
      const conf = (await api.listAppointments(bDay, bDay)).filter((a) => a.status === 'booked' && a.startMin < e && a.startMin + a.durationMin > s);
      if (conf.length) return setErr(`Conflito com ${conf.length} agendamento(s): ${conf.map((a) => `${hm(a.startMin)} ${a.clientName}`).join(', ')}. Cancele ou remarque antes de bloquear.`);
      await api.addBlock({ day: bDay, startMin: s, endMin: e });
      setBStart('');
      setBEnd('');
      notify('Horário bloqueado');
      onChanged();
    } catch (x) {
      fail(x);
    }
  }
  async function addOff() {
    setErr('');
    if (!oDay) return setErr('Escolha a data da folga.');
    try {
      const conf = (await api.listAppointments(oDay, oDay)).filter((a) => a.status === 'booked');
      if (conf.length) return setErr(`Há ${conf.length} agendamento(s) em ${fmtShort(oDay)}. Cancele ou remarque antes de marcar folga.`);
      await api.addDayOff(oDay);
      setODay('');
      notify('Folga marcada');
      onChanged();
    } catch (x) {
      fail(x);
    }
  }

  const offs = (pub?.daysOff ?? []).filter((d) => d >= today).sort();

  return (
    <div className="cfg">
      <div className="card">
        <h3>Bloquear horário</h3>
        <p style={{ color: 'var(--faint)', fontSize: 14 }}>O horário some do site para os clientes.</p>
        <div className="row">
          <input type="date" className="input input--sm" value={bDay} min={today} onChange={(e) => setBDay(e.target.value)} aria-label="Data" />
          <input type="time" className="input input--sm" value={bStart} step={900} onChange={(e) => setBStart(e.target.value)} aria-label="Início" />
          <input type="time" className="input input--sm" value={bEnd} step={900} onChange={(e) => setBEnd(e.target.value)} aria-label="Fim" />
          <button className="adm-btn adm-btn--gold" onClick={() => void addBlock()}>
            Bloquear
          </button>
        </div>
        <AnimatePresence>
          {err ? (
            <motion.div className="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {err}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {blocks.map((b) => (
            <motion.div key={b.id} layout className="list-item" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }}>
              <span>
                {fmtShort(b.day)} · {hm(b.startMin)} às {hm(b.endMin)}
              </span>
              <button
                onClick={() =>
                  api
                    .deleteBlock(b.id)
                    .then(() => {
                      notify('Bloqueio removido');
                      onChanged();
                    })
                    .catch(fail)
                }
              >
                Remover
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="card">
        <h3>Marcar folga (dia inteiro)</h3>
        <div className="row">
          <input type="date" className="input input--sm" value={oDay} min={today} onChange={(e) => setODay(e.target.value)} aria-label="Data da folga" />
          <button className="adm-btn adm-btn--gold" onClick={() => void addOff()}>
            Marcar folga
          </button>
        </div>
        <AnimatePresence initial={false}>
          {offs.map((o) => (
            <motion.div key={o} layout className="list-item" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }}>
              <span>{cap(fmtLong(o))}</span>
              <button
                onClick={() =>
                  api
                    .deleteDayOff(o)
                    .then(() => {
                      notify('Folga removida');
                      onChanged();
                    })
                    .catch(fail)
                }
              >
                Remover
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <span style={{ fontSize: 13, color: 'var(--faint)' }}>Funcionamento semanal</span>
          {pub
            ? hoursTable(pub.hours).map((h) => (
                <div key={h.weekday} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: h.closed ? 'var(--placeholder)' : 'var(--cream)' }}>
                  <span>{h.day}</span>
                  <span>{h.text}</span>
                </div>
              ))
            : null}
          <span style={{ fontSize: 12, color: 'var(--faint)', marginTop: 6 }}>Para mudar o expediente semanal, edite a tabela “business_hours” no Supabase (veja o README).</span>
        </div>
      </div>
    </div>
  );
}
