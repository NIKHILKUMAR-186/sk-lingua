import { motion } from "framer-motion";

interface RatingBreakdownProps {
  distribution: Record<number, number>;
  total: number;
}

export function RatingBreakdown({ distribution, total }: RatingBreakdownProps) {
  if (total === 0) return null;

  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;

        return (
          <div key={star} className="flex items-center gap-2 text-sm group">
            <span className="w-6 text-right text-xs font-medium text-muted-foreground">{star}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full bg-warning transition-all group-hover:opacity-80"
              />
            </div>
            <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
