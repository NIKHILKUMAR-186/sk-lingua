import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg" | "xl";
  maxStars?: number;
  interactive?: boolean;
  label?: string;
  showValue?: boolean;
}

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-7 w-7",
};

export function RatingStars({
  value,
  onChange,
  size = "md",
  maxStars = 5,
  interactive = false,
  label,
  showValue = false,
}: RatingStarsProps) {
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <div className="flex items-center gap-0.5">
        {stars.map((star) => {
          const filled = value >= star;
          const half = !filled && value >= star - 0.5;
          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              onClick={() => onChange?.(star)}
              className={cn(
                "transition-all",
                interactive ? "cursor-pointer hover:scale-110" : "cursor-default",
                interactive && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              )}
            >
              <motion.div
                whileHover={interactive ? { scale: 1.2 } : {}}
                whileTap={interactive ? { scale: 0.9 } : {}}
              >
                <Star
                  className={cn(
                    sizeMap[size],
                    "transition-colors",
                    filled
                      ? "fill-warning text-warning"
                      : half
                        ? "fill-warning/50 text-warning"
                        : "text-muted-foreground/30"
                  )}
                />
              </motion.div>
            </button>
          );
        })}
        {showValue && value > 0 && (
          <span className="ml-1.5 text-sm font-medium text-muted-foreground tabular-nums">
            {value.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}

