import { m, useReducedMotion } from 'motion/react';

/**
 * A luminária hexagonal do teto da barbearia, desenhada como tubos de LED.
 * Arestas compartilhadas entre hexágonos viram um único tubo, como na peça real.
 * Calculado uma vez no carregamento do módulo (geometria estática).
 */
const R = 60;
const SQ3 = Math.sqrt(3);
// coordenadas axiais (q, r) dos favos, imitando o desenho do teto
const CELLS: [number, number][] = [
  [0, 0], [1, 0], [-1, 1], [0, 1], [1, -1], [2, -1], [-1, 0], [2, 0], [0, -1],
];

type Tube = { d: string; delay: number };

const TUBES: Tube[] = (() => {
  const seen = new Map<string, { a: [number, number]; b: [number, number]; dist: number }>();
  for (const [q, r] of CELLS) {
    const cx = R * 1.5 * q;
    const cy = R * SQ3 * (r + q / 2);
    const pts: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 3) * i;
      pts.push([Math.round((cx + R * Math.cos(ang)) * 10) / 10, Math.round((cy + R * Math.sin(ang)) * 10) / 10]);
    }
    for (let i = 0; i < 6; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % 6];
      const key = [a.join(','), b.join(',')].sort().join('|');
      if (!seen.has(key)) {
        const mx = (a[0] + b[0]) / 2 - 45;
        const my = (a[1] + b[1]) / 2;
        seen.set(key, { a, b, dist: Math.hypot(mx, my) });
      }
    }
  }
  const max = Math.max(...[...seen.values()].map((e) => e.dist));
  return [...seen.values()].map(({ a, b, dist }) => ({
    d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`,
    // acende do centro para fora, com um pouco de acaso de lâmpada velha
    delay: 0.15 + (dist / max) * 0.9 + ((a[0] * 7 + b[1] * 13) % 10) / 60,
  }));
})();

export function HexLights() {
  const reduce = useReducedMotion();

  return (
    <div className="hexlights" aria-hidden="true">
      <svg viewBox="-165 -170 420 340" className="hexlights__svg">
        <defs>
          <filter id="tube-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <g className="hexlights__glow" filter="url(#tube-glow)">
          {TUBES.map((t, i) => (
            <m.path
              key={i}
              d={t.d}
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 0.25, 1, 0.6, 1] }}
              transition={{
                pathLength: { duration: 0.35, delay: t.delay, ease: 'easeOut' },
                opacity: { duration: 0.6, delay: t.delay, times: [0, 0.2, 0.35, 0.55, 0.7, 1] },
              }}
            />
          ))}
        </g>
        <g className="hexlights__core">
          {TUBES.map((t, i) => (
            <m.path
              key={i}
              d={t.d}
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: t.delay, ease: 'easeOut' }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
