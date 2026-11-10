import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { SHOP, mapsDirectionsUrl, mapsEmbedUrl, waLink } from '../config';
import { Reveal, staggerChild, staggerParent } from '../components/Reveal';
import { WhatsAppIcon } from '../components/Icons';
import type { HoursWindow, Service } from '../data/types';
import { WEEKDAYS_LONG, brlShort, durLabel, hmLabel } from '../lib/format';

/* ---------- Faixa ---------- */
export function Marquee({ items }: { items: string[] }) {
  const list = [...items, 'Horário marcado'];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {[0, 1].map((k) =>
          list.map((m, i) => (
            <span className="marquee__item" key={`${k}-${i}`}>
              {m}
              <span>✦</span>
            </span>
          )),
        )}
      </div>
    </div>
  );
}

/* ---------- Serviços ---------- */
export function ServicesMenu({ services, onBook }: { services: Service[] | null; onBook: (id: string) => void }) {
  return (
    <section id="servicos" className="section services" aria-labelledby="servicos-title">
      <div className="container container--md">
        <Reveal className="services__head">
          <div>
            <span className="eyebrow">Serviços</span>
            <h2 id="servicos-title" className="h2">
              O cardápio da casa
            </h2>
          </div>
          <p>
            Toque em <strong>Agendar</strong> e o serviço já entra selecionado no seu agendamento.
          </p>
        </Reveal>
        <motion.ul className="menu-list" variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
          {services
            ? services.map((s) => (
                <motion.li className="menu-item" key={s.id} variants={staggerChild}>
                  <div className="menu-item__body">
                    <div className="menu-item__line">
                      <h3>{s.name}</h3>
                      <span className="menu-item__dots" aria-hidden="true" />
                      <span className="menu-item__price">{brlShort(s.priceCents)}</span>
                    </div>
                    <div className="menu-item__meta">
                      <span>{s.description}</span>
                      <span>{durLabel(s.durationMin)}</span>
                    </div>
                  </div>
                  <motion.button className="btn btn--ghost" onClick={() => onBook(s.id)} whileTap={{ scale: 0.95 }} aria-label={`Agendar ${s.name}`}>
                    Agendar
                  </motion.button>
                </motion.li>
              ))
            : [0, 1, 2, 3].map((i) => (
                <li key={i} className="menu-item">
                  <div className="skeleton" style={{ height: 64 }} />
                </li>
              ))}
        </motion.ul>
      </div>
    </section>
  );
}

/* ---------- Como funciona ---------- */
const STEPS = [
  ['I', 'Escolha o serviço', 'Preço e duração aparecem antes de você decidir. Sem surpresa no caixa.'],
  ['II', 'Pegue um horário livre', 'Só mostramos horários em que o seu serviço cabe inteiro na agenda.'],
  ['III', 'Pronto, está reservado', 'A confirmação sai na hora. É só chegar no horário.'],
] as const;

export function Steps() {
  return (
    <section className="steps" aria-label="Como funciona o agendamento">
      <motion.ol className="steps__grid container container--md" variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
        {STEPS.map(([n, t, d]) => (
          <motion.li key={n} variants={staggerChild}>
            <span className="steps__num" aria-hidden="true">
              {n}
            </span>
            <h3>{t}</h3>
            <p>{d}</p>
          </motion.li>
        ))}
      </motion.ol>
    </section>
  );
}

/* ---------- Sobre ---------- */
const GALLERY = [
  ['galeria-corte', 'Acabamento de degradê na navalha'],
  ['galeria-barba', 'Barba sendo modelada'],
  ['galeria-ambiente', 'Ambiente da barbearia'],
] as const;

export function About() {
  return (
    <section id="sobre" className="section" aria-labelledby="sobre-title">
      <div className="container about__grid">
        <Reveal className="about__copy">
          <span className="eyebrow">A casa</span>
          <h2 id="sobre-title" className="h2">
            Detalhe na navalha, <em>conversa boa</em> na cadeira.
          </h2>
          <p className="lead">
            A Khalifa Barber Shop atende em Modelo, de terça a sábado. Degradê, corte social, barba e sobrancelha — cada atendimento com hora marcada, para você ter a atenção toda do barbeiro.
          </p>
          <a href={SHOP.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
            Ver cortes no Instagram <span>@{SHOP.instagramHandle}</span>
          </a>
        </Reveal>
        <div className="gallery">
          {GALLERY.map(([f, alt], i) => (
            <motion.figure
              key={f}
              initial={{ opacity: 0, scale: 0.94, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
            >
              <picture>
                <source type="image/webp" srcSet={`/img/${f}-800.webp 800w, /img/${f}-1400.webp 1400w`} sizes="(max-width: 900px) 50vw, 300px" />
                <img src={`/img/${f}-800.webp`} alt={alt} loading="lazy" decoding="async" />
              </picture>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Contato ---------- */
export function hoursTable(hours: HoursWindow[]) {
  return [2, 3, 4, 5, 6, 0, 1].map((d) => {
    const w = hours.filter((h) => h.weekday === d).sort((a, b) => a.startMin - b.startMin);
    return { weekday: d, day: WEEKDAYS_LONG[d], text: w.length ? w.map((x) => `${hmLabel(x.startMin)}–${hmLabel(x.endMin)}`).join(' · ') : 'Fechado', closed: !w.length };
  });
}

export function Contact({ hours, todayWeekday }: { hours: HoursWindow[] | null; todayWeekday: number }) {
  const rows = hours ? hoursTable(hours) : [];
  return (
    <section id="contato" className="section" aria-labelledby="contato-title">
      <div className="container contact__grid">
        <Reveal className="contact__info">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="eyebrow">Onde estamos</span>
            <h2 id="contato-title" className="h2">
              Venha nos visitar
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="label">Endereço</span>
            <address>
              {SHOP.addressFull}
              <br />
              {SHOP.cep}
            </address>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="label">Horários</span>
            <dl className="hours">
              {rows.map((r) => (
                <div key={r.weekday} className={`${r.closed ? 'is-closed' : ''} ${r.weekday === todayWeekday ? 'is-today' : ''}`}>
                  <dt>
                    {r.day}
                    {r.weekday === todayWeekday ? <span className="sr-only"> (hoje)</span> : null}
                  </dt>
                  <dd>{r.text}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="contact__links">
            <a href={mapsDirectionsUrl} target="_blank" rel="noopener noreferrer" className="btn btn--gold">
              Como chegar
            </a>
            <a href={waLink('Olá! Vim pelo site da Khalifa Barber Shop.')} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
              WhatsApp {SHOP.whatsappLabel}
            </a>
            <a href={SHOP.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
              Instagram
            </a>
          </div>
        </Reveal>
        <Reveal className="map" delay={0.1}>
          <iframe title="Mapa: Khalifa Barber Shop em Modelo, SC" src={mapsEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- CTA final, rodapé, WhatsApp ---------- */
export function FinalCta() {
  return (
    <section className="final-cta">
      <Reveal className="final-cta__inner">
        <img src="/img/logo.png" alt="" aria-hidden="true" width={200} height={146} loading="lazy" />
        <h2>Sua cadeira está esperando.</h2>
        <motion.a href="#agendamento" className="btn btn--gold btn--lg" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          Agendar meu horário
        </motion.a>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span>
          © {new Date().getFullYear()} {SHOP.name} · {SHOP.city}
        </span>
        <nav aria-label="Rodapé">
          <Link to="/privacidade">Política de privacidade</Link>
          <Link to="/admin">Área do barbeiro</Link>
        </nav>
      </div>
    </footer>
  );
}

export function WhatsAppFab() {
  return (
    <motion.a
      href={waLink('Olá! Vim pelo site da Khalifa Barber Shop.')}
      target="_blank"
      rel="noopener noreferrer"
      className="wa-fab"
      aria-label="Falar no WhatsApp"
      initial={{ opacity: 0, y: 40, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 1.6 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <WhatsAppIcon />
      WhatsApp
    </motion.a>
  );
}
