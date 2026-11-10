import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import { Fragment, useRef } from 'react';
import { SHOP } from '../config';
import { EASE } from '../components/Reveal';

interface Props {
  nextFree: { label: string; onClick: () => void } | null;
  hoursSummary: string;
}

const TITLE: { text: string; gold?: boolean }[] = [{ text: 'Estilo' }, { text: 'afiado,' }, { text: 'horário' }, { text: 'garantido.', gold: true }];

const intro = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};
const word = {
  hidden: { y: '105%' },
  show: { y: '0%', transition: { duration: 0.9, ease: EASE } },
};

export function Hero({ nextFree, hoursSummary }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const markY = useTransform(scrollYProgress, [0, 1], ['-50%', '-20%']);
  const markRotate = useTransform(scrollYProgress, [0, 1], [-6, -2]);
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);

  return (
    <section id="inicio" ref={ref} className="hero" aria-labelledby="hero-title">
      <motion.img src="/img/logo.png" alt="" aria-hidden="true" className="hero__watermark" style={{ y: markY, rotate: markRotate }} />
      <div className="hero__grid">
        <motion.div className="hero__copy" variants={intro} initial="hidden" animate="show">
          <motion.p className="hero__kicker eyebrow" variants={rise}>
            Barbearia em {SHOP.city}
          </motion.p>
          <h1 id="hero-title" className="hero__title">
            {TITLE.map((w, i) => (
              <Fragment key={i}>
                <span className="word">
                  <motion.span variants={word}>{w.gold ? <em className="gold-text">{w.text}</em> : w.text}</motion.span>
                </span>
                {i < TITLE.length - 1 ? ' ' : null}
              </Fragment>
            ))}
          </h1>
          <motion.p className="hero__lead" variants={rise}>
            Escolha o serviço, veja os horários livres de verdade e reserve sua cadeira em menos de um minuto. Sem fila, sem troca de mensagens.
          </motion.p>
          <motion.div className="hero__ctas" variants={rise}>
            <motion.a href="#agendamento" className="btn btn--gold btn--lg" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              Agendar meu horário
            </motion.a>
            <a href="#servicos" className="btn btn--ghost btn--lg">
              Ver serviços e preços
            </a>
          </motion.div>
          <motion.dl className="hero__facts" variants={rise}>
            <div>
              <dt className="label">Atendimento</dt>
              <dd>Terça a sábado</dd>
            </div>
            <div>
              <dt className="label">Horários</dt>
              <dd>{hoursSummary}</dd>
            </div>
            <div>
              <dt className="label">Endereço</dt>
              <dd>{SHOP.street}</dd>
            </div>
          </motion.dl>
        </motion.div>

        <div className="hero__visual">
          <motion.div
            className="hero__arch-line"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.5 }}
          />
          <motion.div
            className="hero__arch"
            initial={{ clipPath: 'inset(100% 0% 0% 0% round 240px 240px 14px 14px)' }}
            animate={{ clipPath: 'inset(0% 0% 0% 0% round 240px 240px 14px 14px)' }}
            transition={{ duration: 1.3, ease: EASE, delay: 0.25 }}
          >
            <motion.picture style={{ y: photoY, display: 'block', height: '112%', marginTop: '-6%' }}>
              <source type="image/webp" srcSet="/img/hero-800.webp 800w, /img/hero-1400.webp 1400w" sizes="(max-width: 520px) 100vw, 460px" />
              <motion.img
                src="/img/hero-800.webp"
                alt="Barbeiro aparando a barba de um cliente na cadeira"
                width={800}
                height={533}
                fetchPriority="high"
                initial={{ scale: 1.18 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.8, ease: EASE, delay: 0.25 }}
              />
            </motion.picture>
          </motion.div>

          <motion.div
            className="next-card"
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 1.1 }}
            aria-live="polite"
          >
            <div className="next-card__label">
              <span className="live-dot" aria-hidden="true" />
              Próximo horário livre
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={nextFree?.label ?? 'loading'}
                className="next-card__value"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {nextFree ? nextFree.label : '…'}
              </motion.div>
            </AnimatePresence>
            <motion.button className="btn" onClick={nextFree?.onClick} disabled={!nextFree} whileTap={{ scale: 0.95 }}>
              Reservar esse horário
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
