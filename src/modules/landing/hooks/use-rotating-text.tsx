import { useState, useEffect, useRef, type ReactNode } from "react";

type RotatingTextProps = {
  words: string[];
  interval?: number;
  className?: string;
};

export function RotatingText({ words, interval = 2800, className }: RotatingTextProps) {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (words.length <= 1) return;

    timerRef.current = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setIsVisible(true);
      }, 400);
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [words, interval]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  return (
    <span className={`relative inline-block ${className ?? ""}`} aria-live="polite">
      <span
        className="inline-block transition-all duration-300 ease-out"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0px)" : "translateY(8px)",
        }}
      >
        {words[index]}
      </span>
    </span>
  );
}
