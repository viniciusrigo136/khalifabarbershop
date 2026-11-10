-- =============================================================================
-- Khalifa Barber Shop — schema inicial
--
-- Rode este arquivo inteiro no Supabase: Dashboard → SQL Editor → New query.
-- (ou `supabase db push` se você usa a CLI)
--
-- Modelo de segurança:
--   * Visitantes (anon) só LEEM serviços ativos, horários de funcionamento,
--     folgas e configurações. Nunca leem nomes/telefones de clientes.
--   * Para ver horários ocupados o site chama get_busy_intervals(), que devolve
--     só dia/início/fim — sem dados pessoais.
--   * Para agendar o site chama book_appointment(), que revalida TUDO no banco
--     (horário de funcionamento, antecedência, folgas, bloqueios, conflito).
--   * Dois agendamentos no mesmo horário são impossíveis: uma EXCLUSION
--     CONSTRAINT no Postgres impede sobreposição, mesmo com cliques simultâneos.
--   * Só usuários listados em public.staff (o barbeiro) acessam o painel.
-- =============================================================================

create extension if not exists btree_gist;

-- -----------------------------------------------------------------------------
-- Equipe (quem pode entrar no painel)
-- -----------------------------------------------------------------------------
create table if not exists public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- Configurações gerais (linha única)
-- -----------------------------------------------------------------------------
create table if not exists public.settings (
  id               boolean primary key default true check (id),
  slot_step_min    int  not null default 15 check (slot_step_min between 5 and 60),
  min_advance_min  int  not null default 60 check (min_advance_min between 0 and 1440),
  horizon_days     int  not null default 30 check (horizon_days between 1 and 180),
  max_active_per_phone int not null default 3 check (max_active_per_phone between 1 and 20),
  timezone         text not null default 'America/Sao_Paulo'
);
insert into public.settings (id) values (true) on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Serviços
-- -----------------------------------------------------------------------------
create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  description  text not null default '' check (char_length(description) <= 160),
  price_cents  int  not null check (price_cents between 0 and 1000000),
  duration_min int  not null check (duration_min between 5 and 480 and duration_min % 5 = 0),
  active       boolean not null default true,
  sort         int  not null default 0,
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Funcionamento semanal: várias janelas por dia (0 = domingo … 6 = sábado)
-- Minutos desde 00:00. Ex.: 8h30 = 510, 11h30 = 690.
-- -----------------------------------------------------------------------------
create table if not exists public.business_hours (
  id        uuid primary key default gen_random_uuid(),
  weekday   smallint not null check (weekday between 0 and 6),
  start_min int not null check (start_min between 0 and 1439),
  end_min   int not null check (end_min between 1 and 1440),
  check (end_min > start_min)
);

-- Folgas (dia inteiro fechado)
create table if not exists public.days_off (
  day        date primary key,
  note       text,
  created_at timestamptz not null default now()
);

-- Bloqueios de horário (ex.: compromisso do barbeiro)
create table if not exists public.blocks (
  id         uuid primary key default gen_random_uuid(),
  day        date not null,
  start_min  int not null check (start_min between 0 and 1439),
  end_min    int not null check (end_min between 1 and 1440),
  note       text,
  created_at timestamptz not null default now(),
  check (end_min > start_min)
);
create index if not exists blocks_day_idx on public.blocks (day);

-- -----------------------------------------------------------------------------
-- Agendamentos
-- Nome/preço/duração do serviço são copiados no momento da reserva: se o
-- barbeiro mudar o preço depois, reservas antigas mantêm o valor combinado.
-- -----------------------------------------------------------------------------
create table if not exists public.appointments (
  id            uuid primary key default gen_random_uuid(),
  day           date not null,
  start_min     int  not null check (start_min between 0 and 1439),
  duration_min  int  not null check (duration_min between 5 and 480),
  span          int4range generated always as (int4range(start_min, start_min + duration_min)) stored,
  service_id    uuid references public.services (id) on delete set null,
  service_name  text not null,
  price_cents   int  not null check (price_cents >= 0),
  client_name   text not null check (char_length(btrim(client_name)) between 1 and 60),
  client_phone  text not null default '' check (client_phone ~ '^[0-9]{0,13}$'),
  origin        text not null default 'site' check (origin in ('site', 'painel')),
  status        text not null default 'booked' check (status in ('booked', 'done', 'cancelled')),
  created_at    timestamptz not null default now(),
  -- Impede dois atendimentos sobrepostos no mesmo dia.
  constraint appointments_no_overlap
    exclude using gist (day with =, span with &&) where (status <> 'cancelled')
);
create index if not exists appointments_day_idx on public.appointments (day) where status <> 'cancelled';
create index if not exists appointments_phone_idx on public.appointments (client_phone) where status = 'booked';

-- -----------------------------------------------------------------------------
-- Recebimentos (financeiro)
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid unique references public.appointments (id) on delete set null,
  client_name    text not null default 'Avulso',
  service_name   text not null,
  amount_cents   int  not null check (amount_cents between 0 and 10000000),
  method         text not null check (method in ('pix', 'dinheiro', 'cartao')),
  paid_on        date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  created_at     timestamptz not null default now()
);
create index if not exists payments_paid_on_idx on public.payments (paid_on);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.staff          enable row level security;
alter table public.settings       enable row level security;
alter table public.services       enable row level security;
alter table public.business_hours enable row level security;
alter table public.days_off       enable row level security;
alter table public.blocks         enable row level security;
alter table public.appointments   enable row level security;
alter table public.payments       enable row level security;

-- staff: cada um vê só a própria linha (para o app saber se é barbeiro)
drop policy if exists staff_self_read on public.staff;
create policy staff_self_read on public.staff for select to authenticated using (user_id = auth.uid());

-- Leitura pública
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to anon, authenticated using (true);

drop policy if exists services_read on public.services;
create policy services_read on public.services for select to anon, authenticated using (active or public.is_staff());

drop policy if exists hours_read on public.business_hours;
create policy hours_read on public.business_hours for select to anon, authenticated using (true);

drop policy if exists days_off_read on public.days_off;
create policy days_off_read on public.days_off for select to anon, authenticated using (true);

-- Escrita: só equipe
drop policy if exists settings_staff on public.settings;
create policy settings_staff on public.settings for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists services_staff on public.services;
create policy services_staff on public.services for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists hours_staff on public.business_hours;
create policy hours_staff on public.business_hours for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists days_off_staff on public.days_off;
create policy days_off_staff on public.days_off for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists blocks_staff on public.blocks;
create policy blocks_staff on public.blocks for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists appointments_staff on public.appointments;
create policy appointments_staff on public.appointments for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists payments_staff on public.payments;
create policy payments_staff on public.payments for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Visitantes não têm nenhum privilégio de escrita direto nas tabelas.
revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke all on public.appointments, public.payments, public.blocks, public.staff from anon;

-- =============================================================================
-- Funções públicas (RPC)
-- =============================================================================

-- Horários ocupados num intervalo de datas, SEM dados pessoais.
create or replace function public.get_busy_intervals(p_from date, p_to date)
returns table (day date, start_min int, end_min int)
language sql
stable
security definer
set search_path = ''
as $$
  select a.day, a.start_min, a.start_min + a.duration_min
    from public.appointments a
   where a.status <> 'cancelled'
     and a.day between p_from and least(p_to, p_from + 62)
  union all
  select b.day, b.start_min, b.end_min
    from public.blocks b
   where b.day between p_from and least(p_to, p_from + 62);
$$;

-- Agendamento feito pelo cliente no site.
create or replace function public.book_appointment(
  p_service_id uuid,
  p_day        date,
  p_start_min  int,
  p_name       text,
  p_phone      text
)
returns table (id uuid, day date, start_min int, duration_min int, service_name text, price_cents int)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_set     public.settings;
  v_svc     public.services;
  v_now     timestamp;
  v_today   date;
  v_now_min int;
  v_name    text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_end     int;
  v_ok      boolean;
  v_id      uuid;
begin
  select * into v_set from public.settings limit 1;
  v_now     := now() at time zone v_set.timezone;
  v_today   := v_now::date;
  v_now_min := extract(hour from v_now)::int * 60 + extract(minute from v_now)::int;

  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'INVALID_NAME' using errcode = 'P0001';
  end if;
  if v_phone ~ '^55[0-9]{10,11}$' then v_phone := substr(v_phone, 3); end if;
  if v_phone !~ '^[1-9][0-9]{9,10}$' then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;

  select * into v_svc from public.services s where s.id = p_service_id and s.active;
  if not found then
    raise exception 'INVALID_SERVICE' using errcode = 'P0001';
  end if;
  v_end := p_start_min + v_svc.duration_min;

  if p_day is null or p_start_min is null
     or p_day < v_today or p_day > v_today + v_set.horizon_days then
    raise exception 'OUT_OF_RANGE' using errcode = 'P0001';
  end if;
  if p_day = v_today and p_start_min < v_now_min + v_set.min_advance_min then
    raise exception 'TOO_SOON' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.days_off d where d.day = p_day) then
    raise exception 'CLOSED' using errcode = 'P0001';
  end if;

  -- O serviço precisa caber inteiro numa janela de funcionamento e começar
  -- num múltiplo do passo a partir do início da janela.
  select exists (
    select 1 from public.business_hours h
     where h.weekday = extract(dow from p_day)::int
       and p_start_min >= h.start_min
       and v_end <= h.end_min
       and (p_start_min - h.start_min) % v_set.slot_step_min = 0
  ) into v_ok;
  if not v_ok then
    raise exception 'CLOSED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.blocks b
     where b.day = p_day and b.start_min < v_end and b.end_min > p_start_min
  ) then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
  end if;

  -- Anti-spam: limite de reservas futuras ativas por telefone.
  if (select count(*) from public.appointments a
       where a.client_phone = v_phone and a.status = 'booked' and a.day >= v_today)
     >= v_set.max_active_per_phone then
    raise exception 'TOO_MANY' using errcode = 'P0001';
  end if;

  begin
    insert into public.appointments
      (day, start_min, duration_min, service_id, service_name, price_cents, client_name, client_phone, origin)
    values
      (p_day, p_start_min, v_svc.duration_min, v_svc.id, v_svc.name, v_svc.price_cents, v_name, v_phone, 'site')
    returning appointments.id into v_id;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
  end;

  return query select v_id, p_day, p_start_min, v_svc.duration_min, v_svc.name, v_svc.price_cents;
end;
$$;

-- Finaliza um atendimento e registra o recebimento numa única transação.
create or replace function public.finish_appointment(p_id uuid, p_method text, p_amount_cents int)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_a   public.appointments;
  v_tz  text;
  v_pid uuid;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select timezone into v_tz from public.settings limit 1;

  update public.appointments set status = 'done'
   where id = p_id and status = 'booked'
  returning * into v_a;
  if not found then
    raise exception 'NOT_PENDING' using errcode = 'P0001';
  end if;

  insert into public.payments (appointment_id, client_name, service_name, amount_cents, method, paid_on)
  values (v_a.id, v_a.client_name, v_a.service_name, p_amount_cents, p_method, (now() at time zone v_tz)::date)
  returning id into v_pid;
  return v_pid;
end;
$$;

revoke all on function public.finish_appointment(uuid, text, int) from public, anon;
grant execute on function public.finish_appointment(uuid, text, int) to authenticated;
grant execute on function public.get_busy_intervals(date, date) to anon, authenticated;
grant execute on function public.book_appointment(uuid, date, int, text, text) to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

-- =============================================================================
-- Realtime: o painel atualiza sozinho quando chega agendamento do site.
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.appointments;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- =============================================================================
-- Dados iniciais (só insere se estiver vazio)
-- =============================================================================
insert into public.services (name, description, price_cents, duration_min, sort)
select * from (values
  ('Corte degradê',  'Fade na máquina com acabamento na navalha', 4500, 45, 1),
  ('Corte social',   'Clássico na tesoura e máquina',             4000, 30, 2),
  ('Barba',          'Modelagem com toalha quente e navalha',     3500, 30, 3),
  ('Corte + barba',  'O visual completo em uma visita',           7500, 75, 4),
  ('Sobrancelha',    'Alinhamento na navalha',                    1500, 15, 5)
) as v(name, description, price_cents, duration_min, sort)
where not exists (select 1 from public.services);

-- Terça a sábado: 8h30–11h30 e 13h–20h
insert into public.business_hours (weekday, start_min, end_min)
select d, w.s, w.e
  from generate_series(2, 6) as d,
       (values (510, 690), (780, 1200)) as w(s, e)
 where not exists (select 1 from public.business_hours);
