import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { Chrome } from './components/Chrome';
import { Hero } from './components/Hero';
import { Barber, Footer, HomeService, Location, PoleBand, Services, Space } from './components/Sections';

export function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
      <a className="skip" href="#servicos">
        Pular para os serviços
      </a>
      <Chrome />
      <main id="top">
        <Hero />
        <PoleBand />
        <HomeService />
        <Services />
        <Barber />
        <Space />
        <Location />
      </main>
      <Footer />
    </MotionConfig>
    </LazyMotion>
  );
}
