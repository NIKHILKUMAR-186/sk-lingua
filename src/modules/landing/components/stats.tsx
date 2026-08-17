import { useEffect, useRef, useState } from "react";
import { Reveal } from "./reveal";

type Stat = { value: number; suffix: string; prefix?: string; decimals?: number; label: string };

const STATS: Stat[] = [
  { value: 120, suffix: "k+", label: "Active learners worldwide" },
  { value: 40, suffix: "+", label: "Languages offered" },
  { value: 4.9, suffix: "", prefix: "", decimals: 1, label: "Average mentor rating" },
  { value: 98, suffix: "%", label: "Completion rate for monthly goals" },
];

function useCountUp(target: number, decimals: number, start: boolean) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;
    const duration = 1400;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(parseFloat((target * eased).toFixed(decimals)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [start, target, decimals]);

  return value;
}

function AnimatedStat({ stat, index }: { stat: Stat; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const value = useCountUp(stat.value, stat.decimals ?? 0, inView);

  return (
    <Reveal delay={index * 90} className="flex flex-col items-center gap-2 text-center">
      <div ref={ref} className="text-4xl tracking-tight text-foreground sm:text-5xl">
        {stat.prefix}
        {value.toFixed(stat.decimals ?? 0)}
        <span className="text-primary">{stat.suffix}</span>
      </div>
      <p className="max-w-[12rem] text-sm text-muted-foreground">{stat.label}</p>
    </Reveal>
  );
}

export function Stats() {
  return (
    <section className="relative border-y border-border/60 bg-muted/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-4 lg:gap-6 lg:py-20">
        {STATS.map((stat, i) => (
          <AnimatedStat key={stat.label} stat={stat} index={i} />
        ))}
      </div>
    </section>
  );
}
