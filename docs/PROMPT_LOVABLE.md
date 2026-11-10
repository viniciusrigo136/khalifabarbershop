# Prompt para o Lovable

Copie tudo entre as linhas abaixo e cole no chat do Lovable depois de subir o projeto.

---

Este projeto já está pronto (React + Vite + TypeScript). Preciso que você conecte o **Lovable Cloud** e crie o banco de dados. **Não mude o visual, os textos nem a estrutura do front-end.**

## 1. Ativar o Lovable Cloud
Ative o Lovable Cloud neste projeto.

## 2. Criar o banco: rode o SQL pronto, sem alterar
Aplique como migration o arquivo `supabase/migrations/20261110000000_init.sql` **exatamente como está, do início ao fim**. Ele cria:
- tabelas `staff`, `settings`, `services`, `business_hours`, `days_off`, `blocks`, `appointments`, `payments`;
- Row Level Security em todas as tabelas (visitante só lê serviços ativos, horários, folgas e configurações; só quem está em `staff` acessa agendamentos e pagamentos);
- funções `is_staff()`, `get_busy_intervals(p_from, p_to)`, `book_appointment(p_service_id, p_day, p_start_min, p_name, p_phone)` e `finish_appointment(p_id, p_method, p_amount_cents)`;
- a exclusion constraint `appointments_no_overlap` (extensão `btree_gist`), que impede dois agendamentos no mesmo horário;
- a tabela `appointments` no Realtime;
- os 5 serviços iniciais e o horário de funcionamento (terça a sábado, 8h30–11h30 e 13h–20h).

**Não** simplifique nem reescreva políticas, funções, nomes de tabelas ou colunas: o front-end depende exatamente desses nomes.

## 3. Autenticação
- Ative login por **e-mail e senha**.
- **Desative o cadastro público** (sign up). Só o dono cria contas.
- Configure o redirecionamento de recuperação de senha para `/admin/nova-senha` no domínio do projeto.

## 4. Variáveis de ambiente
O código lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`) em `src/data/api.ts`. Garanta que essas variáveis estejam disponíveis no build.

**Não** substitua `src/data/api.ts` nem `src/data/supabaseApi.ts` pelo cliente padrão em `src/integrations/supabase`. Se o Lovable criar esse cliente, pode manter o arquivo, mas o app deve continuar usando `src/data/api.ts`.

## 5. Conferência
Ao terminar, confirme para mim:
1. A tabela `services` tem 5 linhas e `business_hours` tem 10.
2. As 8 tabelas estão com RLS ativado.
3. O aviso roxo de "Modo demonstração" não aparece mais no site.

Depois disso eu crio meu usuário de barbeiro e rodo:

```sql
insert into public.staff (user_id, name)
select id, 'Khalifa' from auth.users where email = 'MEU-EMAIL@exemplo.com';
```

---

## Depois que o Lovable terminar (você faz)

1. **Criar seu login:** no Lovable, abra **Cloud → Users** (ou **Authentication**), clique em **Add user**, informe e-mail e senha e marque como confirmado.
2. **Liberar o painel para esse login:** abra **Cloud → Database → SQL** e rode o `insert into public.staff ...` acima, com o seu e-mail.
3. **Testar:** faça um agendamento no site, depois entre em `/admin` e confira se ele aparece na agenda.
