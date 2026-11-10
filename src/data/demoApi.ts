/**
 * Modo demonstração: tudo salvo no localStorage do navegador.
 * Usado automaticamente quando VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não estão definidos.
 */
import { addDays, shopNow, weekdayOf } from '../lib/format';
import { freeSlots } from '../lib/schedule';
import { digits } from '../lib/phone';
import { ApiError, type Api, type Appointment, type Block, type HoursWindow, type Payment, type Service, type Settings } from './types';

const KEY = 'khalifa_demo_v2';
const AUTH_KEY = 'khalifa_demo_auth';

interface DB {
  services: Service[];
  hours: HoursWindow[];
  daysOff: string[];
  settings: Settings & { maxActivePerPhone: number };
  appointments: Appointment[];
  payments: Payment[];
  blocks: Block[];
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SERVICES: Omit<Service, 'id'>[] = [
  { name: 'Corte degradê', description: 'Fade na máquina com acabamento na navalha', priceCents: 4500, durationMin: 45, active: true, sort: 1 },
  { name: 'Corte social', description: 'Clássico na tesoura e máquina', priceCents: 4000, durationMin: 30, active: true, sort: 2 },
  { name: 'Barba', description: 'Modelagem com toalha quente e navalha', priceCents: 3500, durationMin: 30, active: true, sort: 3 },
  { name: 'Corte + barba', description: 'O visual completo em uma visita', priceCents: 7500, durationMin: 75, active: true, sort: 4 },
  { name: 'Sobrancelha', description: 'Alinhamento na navalha', priceCents: 1500, durationMin: 15, active: true, sort: 5 },
];

function seed(): DB {
  const services = SERVICES.map((s) => ({ ...s, id: uid() }));
  const hours: HoursWindow[] = [2, 3, 4, 5, 6].flatMap((weekday) => [
    { weekday, startMin: 510, endMin: 690 },
    { weekday, startMin: 780, endMin: 1200 },
  ]);
  const today = shopNow().day;
  const by = (n: string) => services.find((s) => s.name === n)!;
  const mk = (clientName: string, clientPhone: string, svc: string, day: string, startMin: number): Appointment => {
    const s = by(svc);
    return { id: uid(), clientName, clientPhone, serviceId: s.id, serviceName: s.name, priceCents: s.priceCents, durationMin: s.durationMin, day, startMin, origin: 'site', status: 'booked' };
  };
  const appointments = [
    mk('Lucas Ferreira (demo)', '49999110001', 'Corte degradê', today, 840),
    mk('Rafael Souza (demo)', '49999110002', 'Corte + barba', today, 930),
    mk('Gabriel Lima (demo)', '49999110003', 'Corte social', today, 1080),
    mk('Pedro Alves (demo)', '49999110004', 'Barba', addDays(today, 1), 540),
    mk('Mateus Rocha (demo)', '49999110005', 'Corte degradê', addDays(today, 1), 810),
  ];
  const methods = ['pix', 'dinheiro', 'cartao', 'pix'] as const;
  const payments: Payment[] = [];
  for (let i = 1; i <= 9; i++) {
    const day = addDays(today, -i);
    if (day.slice(0, 7) !== today.slice(0, 7) || weekdayOf(day) < 2) continue;
    (['Corte degradê', 'Corte + barba', 'Corte social'] as const).forEach((svc, j) => {
      const s = by(svc);
      payments.push({ id: uid(), appointmentId: null, clientName: `Cliente demo ${'ABC'[j]}`, serviceName: s.name, amountCents: s.priceCents, method: methods[(i + j) % 4], paidOn: day, createdAt: new Date(Date.now() - i * 864e5 + j).toISOString() });
    });
  }
  return { services, hours, daysOff: [], settings: { slotStepMin: 15, minAdvanceMin: 60, horizonDays: 30, maxActivePerPhone: 3 }, appointments, payments, blocks: [] };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* sem storage: usa memória */
  }
  const db = seed();
  save(db);
  return db;
}
let mem: DB | null = null;
const db = () => (mem ??= load());
function save(d: DB) {
  mem = d;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const authListeners = new Set<(e: string) => void>();

const busyOf = (d: DB) => [
  ...d.appointments.filter((a) => a.status !== 'cancelled').map((a) => ({ day: a.day, startMin: a.startMin, endMin: a.startMin + a.durationMin })),
  ...d.blocks.map((b) => ({ day: b.day, startMin: b.startMin, endMin: b.endMin })),
];
const overlaps = (d: DB, day: string, s: number, e: number, ignore?: string) =>
  d.appointments.some((a) => a.id !== ignore && a.status !== 'cancelled' && a.day === day && s < a.startMin + a.durationMin && e > a.startMin);

export function resetDemo() {
  save(seed());
  emit();
}

export const demoApi: Api = {
  mode: 'demo',

  async getPublicData() {
    const d = db();
    return { services: d.services.filter((s) => s.active).sort((a, b) => a.sort - b.sort), hours: d.hours, daysOff: d.daysOff, settings: d.settings };
  },
  async getBusy(from, to) {
    return busyOf(db()).filter((b) => b.day >= from && b.day <= to);
  },
  async book(i) {
    await wait(650);
    const d = db();
    const name = i.name.trim().replace(/\s+/g, ' ');
    let phone = digits(i.phone);
    if (/^55\d{10,11}$/.test(phone)) phone = phone.slice(2);
    if (name.length < 2 || name.length > 60) throw new ApiError('INVALID_NAME');
    if (!/^[1-9]\d{9,10}$/.test(phone)) throw new ApiError('INVALID_PHONE');
    const s = d.services.find((x) => x.id === i.serviceId && x.active);
    if (!s) throw new ApiError('INVALID_SERVICE');
    const ctx = { hours: d.hours, daysOff: d.daysOff, settings: d.settings, busy: busyOf(d), now: shopNow() };
    if (!freeSlots(ctx, i.day, s.durationMin).includes(i.startMin)) throw new ApiError('SLOT_TAKEN');
    const today = ctx.now.day;
    if (d.appointments.filter((a) => a.clientPhone === phone && a.status === 'booked' && a.day >= today).length >= d.settings.maxActivePerPhone) throw new ApiError('TOO_MANY');
    const a: Appointment = { id: uid(), day: i.day, startMin: i.startMin, durationMin: s.durationMin, serviceId: s.id, serviceName: s.name, priceCents: s.priceCents, clientName: name, clientPhone: phone, origin: 'site', status: 'booked' };
    save({ ...d, appointments: [...d.appointments, a] });
    emit();
    return { id: a.id, day: a.day, startMin: a.startMin, durationMin: a.durationMin, serviceName: a.serviceName, priceCents: a.priceCents };
  },

  async getUser() {
    try {
      const e = sessionStorage.getItem(AUTH_KEY);
      return e ? { id: 'demo', email: e } : null;
    } catch {
      return null;
    }
  },
  async isStaff() {
    return (await this.getUser()) !== null;
  },
  async signIn(email, password) {
    await wait(400);
    if (!/.+@.+\..+/.test(email) || password.length < 4) throw new ApiError('BAD_CREDENTIALS');
    try {
      sessionStorage.setItem(AUTH_KEY, email);
    } catch {
      /* ignore */
    }
    authListeners.forEach((l) => l('SIGNED_IN'));
  },
  async signOut() {
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
    authListeners.forEach((l) => l('SIGNED_OUT'));
  },
  async sendPasswordReset() {
    await wait(400);
  },
  async updatePassword() {
    await wait(400);
  },
  onAuthChange(cb) {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },

  async listServices() {
    return [...db().services].sort((a, b) => a.sort - b.sort);
  },
  async saveService(s) {
    const d = db();
    const svc: Service = { ...s, id: s.id ?? uid() };
    const exists = d.services.some((x) => x.id === svc.id);
    save({ ...d, services: exists ? d.services.map((x) => (x.id === svc.id ? svc : x)) : [...d.services, svc] });
    return svc;
  },
  async listAppointments(from, to) {
    return db()
      .appointments.filter((a) => a.status !== 'cancelled' && a.day >= from && a.day <= to)
      .sort((a, b) => a.day.localeCompare(b.day) || a.startMin - b.startMin);
  },
  async searchAppointments(query, fromDay) {
    const q = query.trim().toLowerCase();
    const qd = digits(query);
    return db()
      .appointments.filter((a) => a.status === 'booked' && a.day >= fromDay && (a.clientName.toLowerCase().includes(q) || (qd.length >= 3 && a.clientPhone.includes(qd))))
      .sort((a, b) => a.day.localeCompare(b.day) || a.startMin - b.startMin);
  },
  async createAppointment(a) {
    const d = db();
    if (overlaps(d, a.day, a.startMin, a.startMin + a.durationMin)) throw new ApiError('SLOT_TAKEN');
    const appt: Appointment = { ...a, id: uid(), origin: 'painel', status: 'booked' };
    save({ ...d, appointments: [...d.appointments, appt] });
    emit();
    return appt;
  },
  async cancelAppointment(id) {
    const d = db();
    save({ ...d, appointments: d.appointments.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)) });
    emit();
  },
  async finishAppointment(id, method, amountCents) {
    const d = db();
    const a = d.appointments.find((x) => x.id === id);
    if (!a || a.status !== 'booked') throw new ApiError('NOT_PENDING');
    save({
      ...d,
      appointments: d.appointments.map((x) => (x.id === id ? { ...x, status: 'done' } : x)),
      payments: [...d.payments, { id: uid(), appointmentId: id, clientName: a.clientName, serviceName: a.serviceName, amountCents, method, paidOn: shopNow().day, createdAt: new Date().toISOString() }],
    });
    emit();
  },
  async addWalkIn(p) {
    const d = db();
    save({ ...d, payments: [...d.payments, { id: uid(), appointmentId: null, clientName: p.clientName || 'Avulso', serviceName: p.serviceName, amountCents: p.amountCents, method: p.method, paidOn: shopNow().day, createdAt: new Date().toISOString() }] });
  },
  async listPayments(from, to) {
    return db()
      .payments.filter((p) => p.paidOn >= from && p.paidOn <= to)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async listBlocks(fromDay) {
    return db()
      .blocks.filter((b) => b.day >= fromDay)
      .sort((a, b) => a.day.localeCompare(b.day) || a.startMin - b.startMin);
  },
  async addBlock(b) {
    const d = db();
    save({ ...d, blocks: [...d.blocks, { ...b, id: uid() }] });
  },
  async deleteBlock(id) {
    const d = db();
    save({ ...d, blocks: d.blocks.filter((b) => b.id !== id) });
  },
  async addDayOff(day) {
    const d = db();
    save({ ...d, daysOff: [...new Set([...d.daysOff, day])].sort() });
  },
  async deleteDayOff(day) {
    const d = db();
    save({ ...d, daysOff: d.daysOff.filter((x) => x !== day) });
  },
  subscribeAppointments(cb) {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        mem = null;
        cb();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener('storage', onStorage);
    };
  },
};
