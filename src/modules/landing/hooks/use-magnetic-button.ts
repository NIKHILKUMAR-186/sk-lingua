import { useRef, useEffect, type MouseEvent } from "react";

export function useMagneticButton(strength = 0.12) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const rect = node.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      node.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    };

    const handleMouseLeave = () => {
      node.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
      node.style.transform = "translate(0px, 0px)";
    };

    const handleMouseEnter = () => {
      node.style.transition = "none";
    };

    node.addEventListener("mousemove", handleMouseMove);
    node.addEventListener("mouseleave", handleMouseLeave);
    node.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      node.removeEventListener("mousemove", handleMouseMove);
      node.removeEventListener("mouseleave", handleMouseLeave);
      node.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [strength]);

  return ref;
}
