import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

type Props = { children: ReactNode; delay?: number; y?: number; as?: 'div' | 'li' | 'section' } & Omit<HTMLMotionProps<'div'>, 'children'>;

/** Entrada suave ao aparecer na tela (uma vez). */
export function Reveal({ children, delay = 0, y = 28, as = 'div', ...rest }: Props) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
export const staggerChild = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};
export { EASE };
