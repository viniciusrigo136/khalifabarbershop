import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiError, type Api, type Appointment, type Payment, type Service } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const toService = (r: Row): Service => ({
  id: r.id,
  name: r.name,
  description: r.description ?? '',
  priceCents: r.price_cents,
  durationMin: r.duration_min,
  active: r.active,
  sort: r.sort ?? 0,
});

const toAppt = (r: Row): Appointment => ({
  id: r.id,
  day: r.day,
  startMin: r.start_min,
  durationMin: r.duration_min,
  serviceId: r.service_id,
  serviceName: r.service_name,
  priceCents: r.price_cents,
  clientName: r.client_name,
  clientPhone: r.client_phone ?? '',
  origin: r.origin,
  status: r.status,
});

const toPayment = (r: Row): Payment => ({
  id: r.id,
  appointmentId: r.appointment_id,
  clientName: r.client_name,
  serviceName: r.service_name,
  amountCents: r.amount_cents,
  method: r.method,
  paidOn: r.paid_on,
  createdAt: r.created_at,
});

const KNOWN = ['INVALID_NAME', 'INVALID_PHONE', 'INVALID_SERVICE', 'OUT_OF_RANGE', 'TOO_SOON', 'CLOSED', 'SLOT_TAKEN', 'TOO_MANY', 'NOT_PENDING', 'FORBIDDEN'];

function fail(error: { message?: string; code?: string } | null): never {
  const msg = error?.message ?? '';
  const known = KNOWN.find((k) => msg.includes(k));
  if (known) throw new ApiError(known);
  if (error?.code === '23P01') throw new ApiError('SLOT_TAKEN');
  if (/fetch|network/i.test(msg)) throw new ApiError('NETWORK');
  throw new ApiError('UNKNOWN', msg);
}

function check<T>(res: { data: T; error: any }): T {
  if (res.error) fail(res.error);
  return res.data;
}

export function createSupabaseApi(url: string, anonKey: string): Api {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  return {
    mode: 'supabase',

    async getPublicData() {
      const [svc, hrs, off, set] = await Promise.all([
        sb.from('services').select('*').eq('active', true).order('sort').order('name'),
        sb.from('business_hours').select('weekday,start_min,end_min'),
        sb.from('days_off').select('day').gte('day', new Date(Date.now() - 864e5).toISOString().slice(0, 10)),
        sb.from('settings').select('slot_step_min,min_advance_min,horizon_days').single(),
      ]);
      const s = check(set) as Row;
      return {
        services: (check(svc) as Row[]).map(toService),
        hours: (check(hrs) as Row[]).map((r) => ({ weekday: r.weekday, startMin: r.start_min, endMin: r.end_min })),
        daysOff: (check(off) as Row[]).map((r) => r.day),
        settings: { slotStepMin: s.slot_step_min, minAdvanceMin: s.min_advance_min, horizonDays: s.horizon_days },
      };
    },

    async getBusy(from, to) {
      const rows = check(await sb.rpc('get_busy_intervals', { p_from: from, p_to: to })) as Row[];
      return rows.map((r) => ({ day: r.day, startMin: r.start_min, endMin: r.end_min }));
    },

    async book(i) {
      const res = await sb.rpc('book_appointment', {
        p_service_id: i.serviceId,
        p_day: i.day,
        p_start_min: i.startMin,
        p_name: i.name,
        p_phone: i.phone,
      });
      const r = (check(res) as Row[])[0];
      return { id: r.id, day: r.day, startMin: r.start_min, durationMin: r.duration_min, serviceName: r.service_name, priceCents: r.price_cents };
    },

    async getUser() {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      return u ? { id: u.id, email: u.email ?? '' } : null;
    },
    async isStaff() {
      const { data, error } = await sb.rpc('is_staff');
      return !error && data === true;
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new ApiError(/invalid/i.test(error.message) ? 'BAD_CREDENTIALS' : 'AUTH', error.message);
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async sendPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin/nova-senha` });
      if (error) throw new ApiError('AUTH', error.message);
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw new ApiError('AUTH', error.message);
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => cb(event));
      return () => data.subscription.unsubscribe();
    },

    async listServices() {
      return (check(await sb.from('services').select('*').order('sort').order('name')) as Row[]).map(toService);
    },
    async saveService(s) {
      const row = { name: s.name, description: s.description, price_cents: s.priceCents, duration_min: s.durationMin, active: s.active, sort: s.sort };
      const q = s.id ? sb.from('services').update(row).eq('id', s.id) : sb.from('services').insert(row);
      return toService(check(await q.select().single()) as Row);
    },

    async listAppointments(from, to) {
      const rows = check(
        await sb.from('appointments').select('*').gte('day', from).lte('day', to).neq('status', 'cancelled').order('day').order('start_min'),
      ) as Row[];
      return rows.map(toAppt);
    },
    async searchAppointments(query, fromDay) {
      const q = query.trim();
      const d = q.replace(/\D/g, '');
      const safe = q.replace(/[%,()*"\\]/g, ' ');
      const filter = d.length >= 3 ? `client_name.ilike.%${safe}%,client_phone.ilike.%${d}%` : `client_name.ilike.%${safe}%`;
      const rows = check(
        await sb.from('appointments').select('*').eq('status', 'booked').gte('day', fromDay).or(filter).order('day').order('start_min').limit(50),
      ) as Row[];
      return rows.map(toAppt);
    },
    async createAppointment(a) {
      const row = {
        day: a.day,
        start_min: a.startMin,
        duration_min: a.durationMin,
        service_id: a.serviceId,
        service_name: a.serviceName,
        price_cents: a.priceCents,
        client_name: a.clientName,
        client_phone: a.clientPhone,
        origin: 'painel',
      };
      return toAppt(check(await sb.from('appointments').insert(row).select().single()) as Row);
    },
    async cancelAppointment(id) {
      check(await sb.from('appointments').update({ status: 'cancelled' }).eq('id', id));
    },
    async finishAppointment(id, method, amountCents) {
      check(await sb.rpc('finish_appointment', { p_id: id, p_method: method, p_amount_cents: amountCents }));
    },
    async addWalkIn(p) {
      check(
        await sb.from('payments').insert({
          client_name: p.clientName || 'Avulso',
          service_name: p.serviceName,
          amount_cents: p.amountCents,
          method: p.method,
        }),
      );
    },
    async listPayments(from, to) {
      const rows = check(await sb.from('payments').select('*').gte('paid_on', from).lte('paid_on', to).order('created_at', { ascending: false })) as Row[];
      return rows.map(toPayment);
    },
    async listBlocks(fromDay) {
      const rows = check(await sb.from('blocks').select('*').gte('day', fromDay).order('day').order('start_min')) as Row[];
      return rows.map((r) => ({ id: r.id, day: r.day, startMin: r.start_min, endMin: r.end_min }));
    },
    async addBlock(b) {
      check(await sb.from('blocks').insert({ day: b.day, start_min: b.startMin, end_min: b.endMin }));
    },
    async deleteBlock(id) {
      check(await sb.from('blocks').delete().eq('id', id));
    },
    async addDayOff(day) {
      check(await sb.from('days_off').upsert({ day }));
    },
    async deleteDayOff(day) {
      check(await sb.from('days_off').delete().eq('day', day));
    },
    subscribeAppointments(cb) {
      const ch = sb
        .channel('appointments-feed')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => cb())
        .subscribe();
      return () => {
        void sb.removeChannel(ch);
      };
    },
  };
}
