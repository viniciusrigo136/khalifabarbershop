import { m, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { SHOP, whatsappLink } from '../config';
import { HexLights } from './HexLights';
import { WhatsIcon } from './Icons';
import { greeting, useShopTime } from './useNow';

const EASE = [0.22, 1, 0.36, 1] as const;
// as luzes terminam de acender em ~1,3s; o resto entra logo depois
const AFTER_LIGHTS = 1.15;

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE, delay: AFTER_LIGHTS + 0.25 + i * 0.1 },
  }),
};

export function Hero() {
  const time = useShopTime();
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const lightsY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -120]);
  const lightsTilt = useTransform(scrollYProgress, [0, 1], [52, reduce ? 52 : 70]);

  return (
    <section className="hero" ref={ref} aria-labelledby="hero-title">
      <m.div className="hero__ceiling" style={{ y: lightsY, rotateX: lightsTilt }}>
        <HexLights />
      </m.div>

      <div className="hero__inner">
        <m.img
          className="hero__logo"
          src="/img/logo-256.webp"
          srcSet="/img/logo-256.webp 256w, /img/logo-512.webp 512w"
          sizes="(min-width: 900px) 200px, 132px"
          width={256}
          height={256}
          alt="The Chiodi Barber"
          initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: -14 }}
          animate={{ opacity: 1, scale: 1, rotate: -4 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: AFTER_LIGHTS }}
        />

        <m.p className="hero__clock" initial={reduce ? false : 'hidden'} animate="show" variants={rise} custom={0}>
          <time aria-label={`Agora são ${time.hh} e ${time.mm} em ${SHOP.address.city}`}>
            {time.hh}
            <span className="hero__colon">:</span>
            {time.mm}
          </time>
        </m.p>

        <m.p className="hero__status" initial={reduce ? false : 'hidden'} animate="show" variants={rise} custom={1}>
          <span className="live-dot" aria-hidden="true" />
          {greeting(time.hour)}
        </m.p>

        <m.h1 id="hero-title" className="hero__title" initial={reduce ? false : 'hidden'} animate="show" variants={rise} custom={2}>
          Barbearia aberta 24 horas, e que vai até a sua casa.
        </m.h1>

        <m.div className="hero__actions" initial={reduce ? false : 'hidden'} animate="show" variants={rise} custom={3}>
          <m.a
            className="btn btn--violet"
            href={whatsappLink(`Olá ${SHOP.barber}! Quero marcar um horário.`)}
            target="_blank"
            rel="noopener"
            whileTap={{ scale: 0.96 }}
          >
            <WhatsIcon /> Marcar no WhatsApp
          </m.a>
          <a className="btn btn--ghost" href="#servicos">
            Ver serviços
          </a>
        </m.div>
      </div>
    </section>
  );
}
