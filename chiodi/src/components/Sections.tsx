import { m, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { MAPS_EMBED, MAPS_URL, SERVICES, SHOP, formatMinutes, whatsappLink } from '../config';
import { HouseIcon, InstaIcon, PinIcon, WhatsIcon } from './Icons';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ---------- Faixa do poste de barbeiro ---------- */

const BAND_ITEMS = ['Aberto 24 horas', 'Domingo e feriado', 'De madrugada', 'Atendimento a domicílio', 'Todos os dias'];

export function PoleBand() {
  const row = BAND_ITEMS.map((t) => (
    <span key={t} className="band__item">
      {t}
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <path d="M3 1h6l3 5-3 5H3L0 6z" fill="currentColor" />
      </svg>
    </span>
  ));
  return (
    <div className="band" role="note" aria-label="Aberto 24 horas, todos os dias, com atendimento a domicílio">
      <div className="band__stripes" aria-hidden="true" />
      <div className="band__track" aria-hidden="true">
        <div className="band__row">{row}</div>
        <div className="band__row">{row}</div>
      </div>
    </div>
  );
}

/* ---------- Domicílio ---------- */

const STEPS = [
  { title: 'Mande o endereço', text: 'Chame no WhatsApp e diga onde você está e qual serviço quer.' },
  { title: 'Combine o horário', text: 'Qualquer hora serve, inclusive de madrugada, no domingo ou no feriado.' },
  { title: 'O Hernani chega', text: 'Com máquina, tesoura, navalha, capa e toalha. Você só escolhe a cadeira.' },
];

export function HomeService() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 55%'] });
  const route = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0, 1]);
  const houseScale = useTransform(scrollYProgress, [0.85, 1], [reduce ? 1 : 0.6, 1]);

  return (
    <section className="home" id="domicilio" aria-labelledby="home-title">
      <div className="wrap">
        <h2 id="home-title" className="h2">
          A cadeira vai até você.
        </h2>
        <p className="lead">
          Casa, hotel, casamento, festa ou quem não pode sair: o Hernani atende no seu endereço, no horário que
          você precisar.
        </p>

        <div className="home__grid" ref={ref}>
          <div className="route" aria-hidden="true">
            <svg viewBox="0 0 120 400" preserveAspectRatio="none" className="route__svg">
              <path className="route__base" d="M60 10 C 10 90, 110 150, 60 210 S 10 330, 60 390" />
              <m.path
                className="route__line"
                d="M60 10 C 10 90, 110 150, 60 210 S 10 330, 60 390"
                style={{ pathLength: route }}
              />
            </svg>
            <span className="route__pin route__pin--start">
              <img src="/img/logo-256.webp" alt="" width={44} height={44} loading="lazy" />
            </span>
            <m.span className="route__pin route__pin--end" style={{ scale: houseScale }}>
              <HouseIcon size={22} />
            </m.span>
          </div>

          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step__n">{i + 1}</span>
                <h3 className="step__title">{s.title}</h3>
                <p className="step__text">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <p className="home__note">A taxa de deslocamento depende da distância e é combinada no WhatsApp antes.</p>
        <a
          className="btn btn--violet"
          href={whatsappLink(`Olá ${SHOP.barber}! Quero um atendimento a domicílio. Meu endereço é: `)}
          target="_blank"
          rel="noopener"
        >
          <HouseIcon /> Pedir atendimento em casa
        </a>
      </div>
    </section>
  );
}

/* ---------- Serviços ---------- */

export function Services() {
  return (
    <section className="services" id="servicos" aria-labelledby="services-title">
      <div className="wrap">
        <h2 id="services-title" className="h2">
          Serviços
        </h2>
        <p className="lead">Toque em um serviço para marcar direto no WhatsApp. Todos também a domicílio.</p>

        <ul className="menu">
          {SERVICES.map((s) => (
            <li key={s.name}>
              <m.a
                className="menu__row"
                href={whatsappLink(`Olá ${SHOP.barber}! Quero marcar: ${s.name}.`)}
                target="_blank"
                rel="noopener"
                whileTap={{ scale: 0.98 }}
              >
                <span className="menu__name">{s.name}</span>
                <span className="menu__fill" aria-hidden="true" />
                <span className="menu__price">{s.price ?? formatMinutes(s.minutes)}</span>
                <span className="menu__detail">
                  {s.detail}
                  {s.price ? ` ${formatMinutes(s.minutes)}.` : ''}
                </span>
              </m.a>
            </li>
          ))}
        </ul>
        {SERVICES.some((s) => !s.price) && (
          <p className="services__note">Os valores são passados pelo WhatsApp na hora de marcar.</p>
        )}
      </div>
    </section>
  );
}

/* ---------- Hernani ---------- */

export function Barber() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, -40]);

  return (
    <section className="barber" id="hernani" aria-labelledby="barber-title" ref={ref}>
      <div className="wrap barber__grid">
        <div className="barber__photo">
          <m.img
            style={{ y }}
            src="/img/hernani-600.webp"
            srcSet="/img/hernani-600.webp 600w, /img/hernani-1000.webp 1000w"
            sizes="(min-width: 900px) 440px, 100vw"
            width={600}
            height={800}
            loading="lazy"
            alt="Hernani sorrindo ao lado da cadeira, com a máquina na mão, em frente ao espelho em arco"
          />
        </div>
        <div className="barber__text">
          <h2 id="barber-title" className="h2 h2--light">
            Quem corta é o Hernani.
          </h2>
          <p>
            Dono da cadeira, da tesoura e de uma agenda que não fecha. Corte, degradê, barba e sobrancelha com o
            mesmo cuidado às três da tarde ou às três da manhã.
          </p>
          <p>Prefere ir até você? Ele leva o kit e atende em casa.</p>
          <a
            className="btn btn--white"
            href={whatsappLink(`Olá ${SHOP.barber}! Quero marcar um horário.`)}
            target="_blank"
            rel="noopener"
          >
            <WhatsIcon /> Falar com o Hernani
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- O espaço ---------- */

const PHOTOS = [
  { src: 'espaco-noite', alt: 'Salão com a parede roxa Blessed, cadeiras pretas e a luminária hexagonal acesa', caption: 'A parede roxa e a luz em favo de mel' },
  { src: 'espaco-cadeiras', alt: 'Vista da entrada com as cadeiras de corte, espelhos em arco e a cadeirinha de carrinho', caption: 'Cadeirinha de carrinho para a criançada' },
  { src: 'espaco-dia', alt: 'Salão de dia, com o lavatório, a bancada e o cantinho do café ao fundo', caption: 'Lavatório e cantinho do café' },
];

export function Space() {
  return (
    <section className="space" id="espaco" aria-labelledby="space-title">
      <div className="wrap">
        <h2 id="space-title" className="h2">
          O espaço
        </h2>
        <p className="lead">Rua Duque de Caxias, 75. Luz acesa a noite inteira.</p>
      </div>
      <ul className="gallery">
        {PHOTOS.map((p, i) => (
          <m.li
            key={p.src}
            className="gallery__item"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
          >
            <figure>
              <img
                src={`/img/${p.src}-600.webp`}
                srcSet={`/img/${p.src}-600.webp 600w, /img/${p.src}-1000.webp 1000w`}
                sizes="(min-width: 900px) 360px, 78vw"
                width={600}
                height={800}
                loading="lazy"
                alt={p.alt}
              />
              <figcaption>{p.caption}</figcaption>
            </figure>
          </m.li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Onde fica ---------- */

export function Location() {
  const { address } = SHOP;
  return (
    <section className="location" id="contato" aria-labelledby="loc-title">
      <div className="wrap location__grid">
        <div>
          <h2 id="loc-title" className="h2">
            Onde fica
          </h2>
          <address className="location__address">
            {address.street}
            <br />
            {address.district}, {address.city} – {address.state}
          </address>
          <p className="location__hours">
            <span className="live-dot" aria-hidden="true" /> Aberto 24 horas, todos os dias
          </p>
          <div className="location__actions">
            <a className="btn btn--violet" href={MAPS_URL} target="_blank" rel="noopener">
              <PinIcon /> Como chegar
            </a>
            <a
              className="btn btn--outline"
              href={whatsappLink(`Olá ${SHOP.barber}! Quero marcar um horário.`)}
              target="_blank"
              rel="noopener"
            >
              <WhatsIcon /> WhatsApp
            </a>
          </div>
        </div>
        <div className="map">
          <iframe
            title={`Mapa: ${SHOP.name}, ${address.street}, ${address.city}`}
            src={MAPS_EMBED}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <img src="/img/logo-256.webp" alt="The Chiodi Barber" width={88} height={88} loading="lazy" />
        <p>
          {SHOP.name}. Barbearia 24 horas com atendimento a domicílio em {SHOP.address.city}, {SHOP.address.state}.
        </p>
        {SHOP.instagram ? (
          <a className="footer__insta" href={`https://www.instagram.com/${SHOP.instagram}/`} target="_blank" rel="noopener">
            <InstaIcon /> @{SHOP.instagram}
          </a>
        ) : null}
      </div>
    </footer>
  );
}
