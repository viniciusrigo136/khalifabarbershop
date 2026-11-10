import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { useApi } from '../data/api';
import { ApiError, type Api } from '../data/types';
import Dashboard from './Dashboard';
import './admin.css';

type Gate = 'loading' | 'out' | 'forbidden' | 'in';

function useGate(api: Api): [Gate, () => void] {
  const [gate, setGate] = useState<Gate>('loading');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      const u = await api.getUser();
      if (!u) return alive && setGate('out');
      const ok = await api.isStaff();
      if (alive) setGate(ok ? 'in' : 'forbidden');
    })();
    return () => {
      alive = false;
    };
  }, [api, tick]);
  useEffect(() => api.onAuthChange(() => setTick((t) => t + 1)), [api]);
  return [gate, () => setTick((t) => t + 1)];
}

function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth">
      <motion.div className="auth__card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <img src="/img/logo.png" alt="Khalifa Barber Shop" width={150} height={110} />
        <h1>{title}</h1>
        {children}
      </motion.div>
    </main>
  );
}

function Login({ api, onDone }: { api: Api; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!/.+@.+\..+/.test(email)) return setErr('Digite um e-mail válido.');
    setBusy(true);
    try {
      if (forgot) {
        await api.sendPasswordReset(email);
        setSent(true);
      } else {
        await api.signIn(email, pass);
        onDone();
      }
    } catch (e2) {
      setErr(e2 instanceof ApiError && e2.code === 'BAD_CREDENTIALS' ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title={forgot ? 'Recuperar senha' : 'Área do barbeiro'}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
        <label className="field">
          E-mail
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
        </label>
        {!forgot ? (
          <label className="field">
            Senha
            <input className="input" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
          </label>
        ) : null}
        {err ? (
          <span className="field__err" role="alert">
            {err}
          </span>
        ) : null}
        {sent ? <div className="ok-note">Se esse e-mail tiver acesso, enviamos um link para criar uma nova senha.</div> : null}
        <button className="btn btn--gold btn--block" style={{ borderRadius: 12 }} disabled={busy}>
          {busy ? <span className="spinner" aria-hidden="true" /> : null}
          {forgot ? 'Enviar link de recuperação' : 'Entrar'}
        </button>
      </form>
      <div className="auth__foot">
        <button
          type="button"
          onClick={() => {
            setForgot((f) => !f);
            setErr('');
            setSent(false);
          }}
        >
          {forgot ? '← Voltar ao login' : 'Esqueci a senha'}
        </button>
        <Link to="/">← Voltar ao site</Link>
      </div>
      {api.mode === 'demo' ? <p className="note">Modo demonstração: qualquer e-mail e senha com 4+ caracteres entram. Os dados ficam só neste navegador.</p> : null}
    </AuthCard>
  );
}

function NewPassword({ api }: { api: Api }) {
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pass.length < 8) return setErr('Use pelo menos 8 caracteres.');
    if (pass !== pass2) return setErr('As senhas não conferem.');
    setBusy(true);
    try {
      await api.updatePassword(pass);
      nav('/admin', { replace: true });
    } catch {
      setErr('Link expirado ou inválido. Peça um novo em "Esqueci a senha".');
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthCard title="Nova senha">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
        <label className="field">
          Nova senha
          <input className="input" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
        </label>
        <label className="field">
          Repita a senha
          <input className="input" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
        </label>
        {err ? (
          <span className="field__err" role="alert">
            {err}
          </span>
        ) : null}
        <button className="btn btn--gold btn--block" style={{ borderRadius: 12 }} disabled={busy}>
          Salvar nova senha
        </button>
      </form>
    </AuthCard>
  );
}

function Gatekeeper() {
  const api = useApi();
  const [gate, recheck] = useGate(api);

  useEffect(() => {
    document.title = 'Painel — Khalifa Barber Shop';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (gate === 'loading') return <main className="auth" />;
  if (gate === 'out') return <Login api={api} onDone={recheck} />;
  if (gate === 'forbidden')
    return (
      <AuthCard title="Sem acesso">
        <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Esta conta não está cadastrada como equipe da barbearia.</p>
        <button className="btn btn--ghost btn--block" onClick={() => void api.signOut()}>
          Sair
        </button>
      </AuthCard>
    );
  return <Dashboard api={api} />;
}

export default function AdminApp() {
  return (
    <Suspense fallback={<main className="auth" />}>
      <Routes>
        <Route path="nova-senha" element={<NewPasswordRoute />} />
        <Route path="*" element={<Gatekeeper />} />
      </Routes>
    </Suspense>
  );
}

function NewPasswordRoute() {
  const api = useApi();
  return <NewPassword api={api} />;
}
