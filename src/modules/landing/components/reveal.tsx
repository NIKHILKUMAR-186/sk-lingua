import { useEffect, useRef } from "react";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      node.style.opacity = "1";
      node.style.transform = "none";
      return;
    }

    node.style.opacity = "0";
    node.style.transform = "translateY(16px)";

    const timeout = setTimeout(() => {
      node.style.transition = `opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`;
      node.style.opacity = "1";
      node.style.transform = "translateY(0)";
    }, 50);

    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
