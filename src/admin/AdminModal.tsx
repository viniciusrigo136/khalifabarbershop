import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '../components/Dialog';
import { CloseIcon } from '../components/Icons';
import type { Api, Appointment, Interval, PayMethod, PublicData, Service } from '../data/types';
import { brl, centsToInput, fmtLong, hm, inputToCents, shopNow } from '../lib/format';
import { digits, maskPhone } from '../lib/phone';
import { freeSlots } from '../lib/schedule';

export type ModalState = { type: 'novo'; day: string } | { type: 'avulso' } | { type: 'finish'; appt: Appointment } | { type: 'del'; appt: Appointment };

interface Props {
  state: ModalState | null;
  onClose: () => void;
  api: Api;
  pub: PublicData | null;
  services: Service[];
  act: (fn: () => Promise<unknown>, ok: string) => Promise<void>;
}

const METHODS: [PayMethod, string][] = [
  ['dinheiro', 'Dinheiro'],
  ['pix', 'Pix'],
  ['cartao', 'Cartão'],
];

export function AdminModal({ state, onClose, api, pub, services, act }: Props) {
  // Mantém o último estado durante a animação de saída.
  const last = useRef(state);
  if (state) last.current = state;
  const s = last.current;
  return (
    <Dialog open={!!state} onClose={onClose}>
      {(titleId) => (s ? <Body key={JSON.stringify(s)} s={s} titleId={titleId} onClose={onClose} api={api} pub={pub} services={services} act={act} /> : null)}
    </Dialog>
  );
}

function Body({ s, titleId, onClose, api, pub, services, act }: Omit<Props, 'state'> & { s: ModalState; titleId: string }) {
  const active = services.filter((x) => x.active);
  const [svcId, setSvcId] = useState(() => (s.type === 'finish' || s.type === 'del' ? (s.appt.serviceId ?? '') : (active[0]?.id ?? '')));
  const svc = services.find((x) => x.id === svcId) ?? null;
  const [day, setDay] = useState(s.type === 'novo' ? s.day : shopNow().day);
  const [time, setTime] = useState<string>('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<PayMethod>('pix');
  const [value, setValue] = useState(() => centsToInput(s.type === 'finish' ? s.appt.priceCents : (active[0]?.priceCents ?? 0)));
  const [freeOk, setFreeOk] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyIv, setBusyIv] = useState<Interval[] | null>(null);

  // Horários livres do dia (para "novo agendamento").
  useEffect(() => {
    if (s.type !== 'novo' || !day) return;
    let alive = true;
    setBusyIv(null);
    api
      .getBusy(day, day)
      .then((b) => alive && setBusyIv(b))
      .catch(() => alive && setBusyIv([]));
    return () => {
      alive = false;
    };
  }, [api, day, s.type]);

  const slots = useMemo(() => {
    if (s.type !== 'novo' || !pub || !svc || !busyIv) return [];
    return freeSlots({ hours: pub.hours, daysOff: pub.daysOff, settings: pub.settings, busy: busyIv, now: shopNow() }, day, svc.durationMin, { ignoreAdvance: true });
  }, [s.type, pub, svc, busyIv, day]);

  useEffect(() => {
    if (s.type === 'novo') setTime((t) => (slots.includes(Number(t)) ? t : slots.length ? String(slots[0]) : ''));
  }, [slots, s.type]);

  async function confirm() {
    setErr('');
    const run = async (fn: () => Promise<unknown>, ok: string) => {
      setBusy(true);
      try {
        await act(fn, ok);
      } catch {
        /* toast já mostrado */
      } finally {
        setBusy(false);
      }
    };

    if (s.type === 'del') return run(() => api.cancelAppointment(s.appt.id), 'Agendamento cancelado · horário liberado');

    if (s.type === 'novo') {
      if (!svc) return setErr('Escolha o serviço.');
      if (!name.trim()) return setErr('Informe o nome do cliente.');
      if (time === '') return setErr('Sem horário livre para esse serviço nesse dia.');
      const p = digits(phone);
      if (p && !/^[1-9]\d{9,10}$/.test(p)) return setErr('Telefone com DDD, ou deixe em branco.');
      return run(
        () =>
          api.createAppointment({
            day,
            startMin: Number(time),
            durationMin: svc.durationMin,
            serviceId: svc.id,
            serviceName: svc.name,
            priceCents: svc.priceCents,
            clientName: name.trim(),
            clientPhone: p,
          }),
        'Agendamento criado',
      );
    }

    const cents = inputToCents(value);
    if (Number.isNaN(cents) || cents < 0) return setErr('Valor inválido. Ex.: 45 ou 45,50');
    if (cents === 0 && !freeOk) {
      setFreeOk(true);
      return setErr('Valor zero: clique de novo para confirmar como cortesia.');
    }
    if (s.type === 'finish') return run(() => api.finishAppointment(s.appt.id, method, cents), `Atendimento finalizado · ${brl(cents)}`);
    if (!svc) return setErr('Escolha o serviço.');
    return run(() => api.addWalkIn({ clientName: name.trim(), serviceName: svc.name, amountCents: cents, method }), 'Atendimento avulso registrado');
  }

  const title = s.type === 'finish' ? 'Finalizar atendimento' : s.type === 'avulso' ? 'Atendimento avulso' : s.type === 'novo' ? 'Novo agendamento' : 'Cancelar agendamento?';
  const btn = s.type === 'del' ? 'Cancelar e liberar horário' : s.type === 'novo' ? 'Salvar agendamento' : freeOk ? 'Confirmar como cortesia' : 'Confirmar recebimento';

  return (
    <>
      <div className="dialog__head">
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        <button className="close-btn" onClick={onClose} aria-label="Fechar">
          <CloseIcon />
        </button>
      </div>

      {s.type === 'finish' ? (
        <p style={{ color: 'var(--muted)' }}>
          {s.appt.clientName} — {s.appt.serviceName}
        </p>
      ) : null}
      {s.type === 'del' ? (
        <p style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          {s.appt.clientName} · {s.appt.serviceName} · {fmtLong(s.appt.day)} às {hm(s.appt.startMin)}. O horário volta a ficar livre no site.
        </p>
      ) : null}

      {s.type === 'novo' || s.type === 'avulso' ? (
        <label className="field">
          Serviço
          <select
            className="input input--sm"
            value={svcId}
            onChange={(e) => {
              setSvcId(e.target.value);
              const x = services.find((y) => y.id === e.target.value);
              if (x && s.type === 'avulso') setValue(centsToInput(x.priceCents));
            }}
          >
            {active.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — {brl(o.priceCents)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {s.type === 'novo' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label className="field">
            Data
            <input type="date" className="input input--sm" value={day} min={shopNow().day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <label className="field">
            Horário
            <select className="input input--sm" value={time} onChange={(e) => setTime(e.target.value)} disabled={!slots.length}>
              {slots.length ? (
                slots.map((t) => (
                  <option key={t} value={t}>
                    {hm(t)}
                  </option>
                ))
              ) : (
                <option value="">{busyIv ? 'Sem horários' : 'Carregando…'}</option>
              )}
            </select>
          </label>
        </div>
      ) : null}

      {s.type === 'novo' || s.type === 'avulso' ? (
        <div style={{ display: 'grid', gridTemplateColumns: s.type === 'novo' ? '1fr 1fr' : '1fr', gap: 10 }}>
          <label className="field">
            {s.type === 'avulso' ? 'Cliente (opcional)' : 'Cliente'}
            <input className="input input--sm" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} data-autofocus />
          </label>
          {s.type === 'novo' ? (
            <label className="field">
              Telefone (opcional)
              <input className="input input--sm" inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(49) 99999-9999" />
            </label>
          ) : null}
        </div>
      ) : null}

      {s.type === 'finish' || s.type === 'avulso' ? (
        <>
          <div className="field">
            Forma de pagamento
            <div className="pay-opts" role="group" aria-label="Forma de pagamento">
              {METHODS.map(([id, label]) => (
                <button key={id} type="button" className="chip" style={{ borderRadius: 10, padding: 13 }} aria-pressed={method === id} onClick={() => setMethod(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            Valor recebido (R$)
            <input
              className="input"
              inputMode="decimal"
              style={{ fontSize: 18, fontWeight: 700 }}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setFreeOk(false);
              }}
              data-autofocus={s.type === 'finish' ? true : undefined}
            />
          </label>
        </>
      ) : null}

      {err ? (
        <span className="field__err" role="alert">
          {err}
        </span>
      ) : null}

      <button
        className={s.type === 'del' ? 'btn btn--block' : 'btn btn--gold btn--block'}
        style={{ borderRadius: 12, ...(s.type === 'del' ? { background: '#e5484d', color: '#fff' } : {}) }}
        onClick={() => void confirm()}
        disabled={busy}
      >
        {busy ? <span className="spinner" aria-hidden="true" /> : null}
        {btn}
      </button>
    </>
  );
}
