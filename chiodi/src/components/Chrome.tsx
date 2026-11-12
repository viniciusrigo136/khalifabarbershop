import { AnimatePresence, m, useMotionValueEvent, useScroll } from 'motion/react';
import { useState } from 'react';
import { SHOP, whatsappLink } from '../config';
import { WhatsIcon } from './Icons';

const LINKS = [
  { href: '#domicilio', label: 'Domicílio' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#hernani', label: 'Hernani' },
  { href: '#contato', label: 'Onde fica' },
];

/** Cabeçalho fixo + barra de WhatsApp no rodapé do celular. Ambos aparecem depois do hero. */
export function Chrome() {
  const { scrollY } = useScroll();
  const [past, setPast] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => {
    const next = v > window.innerHeight * 0.7;
    setPast((prev) => (prev === next ? prev : next));
  });

  return (
    <>
      <header className={past ? 'header header--solid' : 'header'}>
        <a href="#top" className="header__brand" aria-label="The Chiodi Barber, voltar ao topo">
          <img src="/img/logo-256.webp" alt="" width={40} height={40} />
          <span>Chiodi Barber</span>
        </a>
        <nav aria-label="Seções" className="header__nav">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
      </header>

      <AnimatePresence>
        {past ? (
          <m.div
            className="dock"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <span className="dock__status">
              <span className="live-dot" aria-hidden="true" /> Aberto agora
            </span>
            <a
              className="btn btn--violet btn--sm"
              href={whatsappLink(`Olá ${SHOP.barber}! Quero marcar um horário.`)}
              target="_blank"
              rel="noopener"
            >
              <WhatsIcon size={18} /> Marcar
            </a>
          </m.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
