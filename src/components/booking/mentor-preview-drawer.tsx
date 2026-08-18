import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const safeMentor = mentor ?? null;
  const hasVideo = !!safeMentor?.introVideoUrl;

  if (!safeMentor) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mentor information unavailable</DialogTitle>
            <DialogDescription>
              This mentor may no longer be available. Please close this preview and try another
              mentor.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-2xl">
              <AvatarImage src={safeMentor.avatarUrl || undefined} alt={safeMentor.name} />
              <AvatarFallback className="rounded-2xl bg-primary/10 text-xl text-primary">
                {safeMentor.nameInitial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-1.5 text-lg">
                {safeMentor.name}
                {safeMentor.isVerified && (
                  <Shield className="h-4 w-4 text-primary" aria-label="Verified" />
                )}
              </DialogTitle>
              {safeMentor.headline && (
                <p className="truncate text-sm text-muted-foreground">{safeMentor.headline}</p>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">
            {safeMentor.name} — preview profile and availability
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick facts */}
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {safeMentor.rating != null && (
              <Badge variant="secondary">
                <Star className="mr-1 h-3.5 w-3.5 fill-warning text-warning" />
                {safeMentor.rating.toFixed(1)} ({safeMentor.totalReviews})
              </Badge>
            )}
            {safeMentor.yearsExperience > 0 && (
              <Badge variant="secondary">
                <Briefcase className="mr-1 h-3.5 w-3.5" />
                {safeMentor.yearsExperience} yr experience
              </Badge>
            )}
            {safeMentor.languages.length > 0 && (
              <Badge variant="secondary">
                <Languages className="mr-1 h-3.5 w-3.5" />
                {safeMentor.languages.join(", ")}
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
              <InlineIntroVideo
                src={safeMentor.introVideoUrl}
                title={`${safeMentor.name} intro video`}
              />
            </div>
          )}

          {safeMentor.teachingStyle && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Style: </span>
              {safeMentor.teachingStyle}
            </p>
          )}

          {safeMentor.bio && (
            <p className="line-clamp-3 text-sm text-muted-foreground">{safeMentor.bio}</p>
          )}

          {/* Available slots */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <div className="mb-2 text-sm font-medium">Available {date}</div>
            {safeMentor.availableSlots.length > 0 ? (
              <SlotTimeline
                slots={safeMentor.availableSlots}
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
