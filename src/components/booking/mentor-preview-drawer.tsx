import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Shield, Languages, Briefcase, Video } from "lucide-react";
import type { BookingMentorViewModel, BookingSlotViewModel } from "@/lib/booking/view-models";
import { SlotTimeline } from "@/components/booking/slot-timeline";
import { InlineIntroVideo } from "@/components/booking/inline-intro-video";

/**
 * MentorPreviewDrawer
 *
 * A lightweight inline preview (modal — bottom-sheet on mobile). The student
 * stays on the booking page; current date, time preference and selection are
 * preserved. Includes the intro video (played inline) and the mentor's actual
 * available slots so they can book without navigating away.
 */
interface MentorPreviewDrawerProps {
  open: boolean;
  mentor: BookingMentorViewModel;
  date: string;
  selectedSlotId?: string | null;
  onSelectSlot: (slot: BookingSlotViewModel) => void;
  onClose: () => void;
}

export function MentorPreviewDrawer({
  open,
  mentor,
  date,
  selectedSlotId,
  onSelectSlot,
  onClose,
}: MentorPreviewDrawerProps) {
  const hasVideo = !!mentor.introVideoUrl;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-2xl">
              <AvatarImage src={mentor.avatarUrl || undefined} alt={mentor.name} />
              <AvatarFallback className="rounded-2xl bg-primary/10 text-xl text-primary">
                {mentor.nameInitial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-1.5 text-lg">
                {mentor.name}
                {mentor.isVerified && (
                  <Shield className="h-4 w-4 text-primary" aria-label="Verified" />
                )}
              </DialogTitle>
              {mentor.headline && (
                <p className="truncate text-sm text-muted-foreground">{mentor.headline}</p>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">
            {mentor.name} — preview profile and availability
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick facts */}
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {mentor.rating != null && (
              <Badge variant="secondary">
                <Star className="mr-1 h-3.5 w-3.5 fill-warning text-warning" />
                {mentor.rating.toFixed(1)} ({mentor.totalReviews})
              </Badge>
            )}
            {mentor.yearsExperience > 0 && (
              <Badge variant="secondary">
                <Briefcase className="mr-1 h-3.5 w-3.5" />
                {mentor.yearsExperience} yr experience
              </Badge>
            )}
            {mentor.languages.length > 0 && (
              <Badge variant="secondary">
                <Languages className="mr-1 h-3.5 w-3.5" />
                {mentor.languages.join(", ")}
              </Badge>
            )}
          </div>

          {/* Intro video — inline, never redirects */}
          {hasVideo && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                <Video className="h-4 w-4 text-primary" />
                Intro video
              </div>
              <InlineIntroVideo src={mentor.introVideoUrl} title={`${mentor.name} intro video`} />
            </div>
          )}

          {mentor.teachingStyle && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Style: </span>
              {mentor.teachingStyle}
            </p>
          )}

          {mentor.bio && <p className="line-clamp-3 text-sm text-muted-foreground">{mentor.bio}</p>}

          {/* Available slots */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <div className="mb-2 text-sm font-medium">Available {date}</div>
            {mentor.availableSlots.length > 0 ? (
              <SlotTimeline
                slots={mentor.availableSlots}
                selectedId={selectedSlotId}
                onSelect={onSelectSlot}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No open slots this day. Pick another date above.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
