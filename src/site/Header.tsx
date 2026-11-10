import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';

const LINKS = [
  ['servicos', 'Serviços'],
  ['sobre', 'Sobre'],
  ['agendamento', 'Agendamento'],
  ['contato', 'Contato'],
] as const;

export function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Destaca no menu a seção visível.
  useEffect(() => {
    const els = LINKS.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`site-header${solid || open ? ' is-solid' : ''}`}>
      <motion.div className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
      <div className="site-header__bar">
        <a href="#inicio" className="site-header__logo" aria-label="Khalifa Barber Shop — início">
          <img src="/img/logo.png" alt="Khalifa Barber Shop" width={71} height={52} />
        </a>
        <nav className="site-nav" aria-label="Principal">
          {LINKS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={active === id ? 'is-active' : undefined}>
              {label}
            </a>
          ))}
          <a href="#agendamento" className="btn btn--gold btn--sm">
            Agendar horário
          </a>
        </nav>
        <div className="site-header__mobile">
          <a href="#agendamento" className="btn btn--gold btn--sm">
            Agendar
          </a>
          <button className="menu-btn" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Fechar menu' : 'Abrir menu'} onClick={() => setOpen((o) => !o)}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="mobile-nav"
            className="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav aria-label="Menu móvel">
              {LINKS.map(([id, label], i) => (
                <motion.a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                >
                  {label}
                </motion.a>
              ))}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
