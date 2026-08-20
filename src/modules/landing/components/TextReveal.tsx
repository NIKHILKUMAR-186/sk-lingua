import { useEffect, useRef, useState } from "react";

interface TextRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "p" | "h2" | "h3" | "span";
}

export function TextReveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: TextRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(24px)",
        filter: isVisible ? "blur(0px)" : "blur(4px)",
        transition: `opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, filter 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}
    >
      <Tag
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          color: "#111118",
          lineHeight: 1.2,
          letterSpacing: "-0.02em",
        }}
      >
        {children}
      </Tag>
    </div>
  );
}
