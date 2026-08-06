import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  DollarSign,
  Star,
  Medal,
  CheckCircle,
  BookOpen,
  Video,
  FileCheck,
} from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import type { Tables } from "@/integrations/supabase/types";

type Gig = Tables<"gigs">;

interface GigCardProps {
  gig: Gig;
  selected?: boolean;
  onSelect?: (id: string) => void;
  showActions?: boolean;
  onEdit?: (gig: Gig) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, active: boolean) => void;
}

export function GigCard({
  gig,
  selected,
  onSelect,
  showActions,
  onEdit,
  onArchive,
  onDelete,
  onToggleActive,
}: GigCardProps) {
  const lang = LANGUAGES.find((l) => l.code === gig.language);
  const levelColors: Record<string, string> = {
    beginner: "bg-green-100 text-green-700",
    intermediate: "bg-yellow-100 text-yellow-700",
    advanced: "bg-red-100 text-red-700",
    all: "bg-blue-100 text-blue-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={onSelect ? { scale: 1.01 } : undefined}
    >
      <Card
        className={`overflow-hidden transition-all duration-200 cursor-pointer ${
          selected
            ? "ring-2 ring-primary ring-offset-2 border-primary"
            : "hover:border-primary/50 hover:shadow-soft"
        } ${!gig.is_active ? "opacity-60" : ""}`}
        onClick={() => onSelect?.(gig.id)}
      >
        {gig.cover_image && (
          <div className="relative h-40 w-full overflow-hidden bg-muted">
            <img src={gig.cover_image} alt={gig.title} className="h-full w-full object-cover" />
            {gig.featured && (
              <div className="absolute right-2 top-2 rounded-full bg-warning/90 px-2.5 py-0.5 text-xs font-medium text-warning-foreground backdrop-blur-sm">
                <Medal className="mr-1 inline h-3 w-3" /> Featured
              </div>
            )}
            <div className="absolute right-2 top-10 flex gap-1">
              {gig.recording_included && (
                <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                  <Video className="mr-0.5 h-3 w-3" /> Recording
                </Badge>
              )}
              {gig.certificate_included && (
                <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                  <FileCheck className="mr-0.5 h-3 w-3" /> Certificate
                </Badge>
              )}
            </div>
          </div>
        )}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{gig.title}</h3>
              {gig.category && <p className="text-xs text-muted-foreground">{gig.category}</p>}
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-bold text-primary">${Number(gig.price).toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">/session</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lang && (
              <Badge variant="outline" className="text-xs">
                {lang.emoji} {lang.name}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" /> {gig.duration_mins} min
            </Badge>
            {gig.level && (
              <Badge variant="outline" className={`text-xs ${levelColors[gig.level] || ""}`}>
                {gig.level}
              </Badge>
            )}
            {gig.homework_included && (
              <Badge variant="outline" className="text-xs">
                <BookOpen className="mr-0.5 h-3 w-3" /> Homework
              </Badge>
            )}
          </div>

          {gig.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{gig.description}</p>
          )}

          {gig.whats_included &&
            Array.isArray(gig.whats_included) &&
            gig.whats_included.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(gig.whats_included as string[]).slice(0, 3).map((item: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <CheckCircle className="h-3 w-3 text-success" /> {item}
                  </span>
                ))}
                {(gig.whats_included as string[]).length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{(gig.whats_included as string[]).length - 3} more
                  </span>
                )}
              </div>
            )}

          {showActions && (
            <div className="flex items-center gap-2 pt-2 border-t">
              {onToggleActive && (
                <Button
                  size="sm"
                  variant={gig.is_active ? "outline" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleActive(gig.id, !gig.is_active);
                  }}
                >
                  {gig.is_active ? "Deactivate" : "Activate"}
                </Button>
              )}
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(gig);
                  }}
                >
                  Edit
                </Button>
              )}
              {onArchive && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(gig.id);
                  }}
                >
                  Archive
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(gig.id);
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
