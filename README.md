# Khalifa Barber Shop

Site da barbearia com **agendamento online** e **painel do barbeiro** (agenda, financeiro, serviços, bloqueios e folgas).

- **Front-end:** React 19 + Vite + TypeScript, animações com [Motion](https://motion.dev)
- **Back-end:** [Supabase](https://supabase.com) (Postgres + Auth + Realtime)
- **Hospedagem sugerida:** Vercel (já configurado em `vercel.json`)

> Sem as variáveis do Supabase o site roda em **modo demonstração**: tudo funciona, mas os dados ficam salvos só no navegador. Bom para testar o visual antes de conectar o banco.

---

## Rodar no computador

```bash
npm install
npm run dev        # http://localhost:5173
```

Outros comandos:

```bash
npm run build      # gera a versão de produção em dist/
npm test           # testes da lógica de horários
```

Painel do barbeiro: `http://localhost:5173/admin` (no modo demonstração, qualquer e-mail e senha com 4+ caracteres entram).

---

## Conectar ao Supabase (passo a passo)

### 1. Criar o projeto
Em [supabase.com](https://supabase.com) → **New project**. Região sugerida: **South America (São Paulo)**.

### 2. Criar as tabelas
No painel do Supabase → **SQL Editor** → **New query**, cole **todo** o conteúdo de
[`supabase/migrations/20261110000000_init.sql`](supabase/migrations/20261110000000_init.sql) e clique em **Run**.

Isso cria as tabelas, as regras de segurança, as funções de agendamento e já cadastra os 5 serviços e o horário de funcionamento (terça a sábado, 8h30–11h30 e 13h–20h).

### 3. Fechar o cadastro público
**Authentication → Sign In / Providers → Email**: desligue **“Allow new users to sign up”**.
Assim ninguém consegue criar conta sozinho. (Mesmo que crie, não entra no painel; veja o passo 4.)

### 4. Criar o login do barbeiro
1. **Authentication → Users → Add user → Create new user**: e-mail + senha, marque **Auto Confirm User**.
2. No **SQL Editor**, libere esse usuário para o painel (troque o e-mail):

```sql
insert into public.staff (user_id, name)
select id, 'Khalifa' from auth.users where email = 'email-do-barbeiro@exemplo.com';
```

Só quem está na tabela `staff` vê agendamentos, nomes, telefones e o financeiro.

### 5. Configurar os links de e-mail (recuperar senha)
**Authentication → URL Configuration**:
- **Site URL:** o endereço do site (ex.: `https://khalifabarbershop.com.br`)
- **Redirect URLs:** adicione `https://SEU-DOMINIO/admin/nova-senha` (e `http://localhost:5173/admin/nova-senha` para testes)

### 6. Colocar as chaves no projeto
**Project Settings → API**: copie a **Project URL** e a chave **anon / publishable** (a pública, *nunca* a `service_role`).

No computador, crie `.env.local` (baseado em `.env.example`):

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Na Vercel: **Project → Settings → Environment Variables**, com os mesmos dois nomes.

A chave anon é pública por natureza: ela vai no navegador. Quem protege os dados são as regras de segurança (RLS) criadas no passo 2.

---

## Publicar na Vercel
1. [vercel.com/new](https://vercel.com/new) → importe o repositório `khalifabarbershop`.
2. Framework: **Vite** (detectado sozinho). Build: `npm run build`. Output: `dist`.
3. Adicione as duas variáveis do passo 6 e clique em **Deploy**.
4. Em **Settings → Domains**, conecte o domínio próprio, se tiver.

(Netlify também funciona; o arquivo `public/_redirects` já está pronto.)

---

## Como a segurança funciona

| Quem | Pode | Não pode |
|---|---|---|
| Visitante | ver serviços ativos, horários de funcionamento e folgas; ver **quais horários estão ocupados** (sem nomes); agendar | ler nome/telefone de ninguém, editar ou apagar qualquer coisa |
| Barbeiro (`staff`) | tudo no painel | — |

- O agendamento passa pela função `book_appointment`, que **revalida tudo no banco**: serviço ativo, dia aberto, horário dentro do expediente, antecedência mínima (60 min), limite de 30 dias, bloqueios e folgas.
- **Dois clientes nunca pegam o mesmo horário**, mesmo clicando ao mesmo tempo: uma *exclusion constraint* do Postgres impede sobreposição.
- Anti-spam: no máximo 3 reservas futuras em aberto por telefone (ajustável em `settings.max_active_per_phone`).
- Finalizar atendimento e registrar o pagamento acontece numa única transação (`finish_appointment`).

---

## Ajustes comuns (SQL Editor)

**Mudar o horário de funcionamento** (minutos desde 00:00; 8h30 = 510, 20h = 1200; 0 = domingo … 6 = sábado):

```sql
-- Exemplo: sábado só de manhã, 8h às 12h
delete from public.business_hours where weekday = 6;
insert into public.business_hours (weekday, start_min, end_min) values (6, 480, 720);
```

**Regras de agendamento:**

```sql
update public.settings set
  slot_step_min = 15,        -- intervalo entre horários oferecidos
  min_advance_min = 60,      -- antecedência mínima
  horizon_days = 30,         -- até quantos dias à frente
  max_active_per_phone = 3;  -- reservas em aberto por telefone
```

Serviços, preços, bloqueios de horário e folgas são editados direto no **painel** (`/admin`).

---

## Onde mudar o quê

| O quê | Arquivo |
|---|---|
| Telefone/WhatsApp, endereço, Instagram, coordenadas do mapa | `src/config.ts` |
| Título, descrição e dados do Google (SEO) | `index.html` |
| Fotos | `public/img/` (formato `.webp`, versões 800px e 1400px) |
| Logo | `public/img/logo.png` |
| Textos das seções | `src/site/Hero.tsx`, `src/site/Sections.tsx`, `src/site/Booking.tsx` |
| Cores e tipografia | `src/styles/global.css` (variáveis no topo) |

## Estrutura

```
src/
  config.ts            dados fixos da barbearia
  data/                camada de dados (Supabase ou demonstração)
  lib/                 datas, telefone, cálculo de horários livres (+ testes)
  site/                páginas e seções do site público
  admin/               painel do barbeiro (carregado só ao acessar /admin)
  components/          diálogo, ícones, animação de entrada
supabase/migrations/   banco de dados (tabelas, segurança, funções)
```
