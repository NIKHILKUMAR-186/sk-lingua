import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Shield, Clock, BookMarked } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { BookingConfirmDialog } from "@/components/booking-confirm-dialog";
import type { AvailableMentor, SlotOption } from "@/hooks/use-available-mentors";

interface MentorCardProps {
  mentor: AvailableMentor;
  selectedDate: string;
}

export function MentorCard({ mentor, selectedDate }: MentorCardProps) {
  const [bookingSlot, setBookingSlot] = useState<SlotOption | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const primaryLanguage = mentor.languages_taught?.[0] || "English";
  const dateObj = parseISO(selectedDate);
  const dateLabel = isSameDay(dateObj, new Date())
    ? "Today"
    : format(dateObj, "EEE, d MMM");

  function handleBook(slot: SlotOption) {
    setBookingSlot(slot);
    setIsDialogOpen(true);
  }

  return (
    <>
      <Card className="h-full transition-all duration-200 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Link to="/student/mentor/$id" params={{ id: mentor.user_id }}>
              <Avatar className="h-12 w-12 cursor-pointer">
                <AvatarImage
                  src={mentor.profile?.avatar_url || undefined}
                  alt={mentor.profile?.full_name || ""}
                />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {mentor.profile?.full_name?.charAt(0) || "M"}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Link
                  to="/student/mentor/$id"
                  params={{ id: mentor.user_id }}
                  className="font-semibold truncate hover:underline"
                >
                  {mentor.profile?.full_name || "Mentor"}
                </Link>
                {mentor.is_verified && (
                  <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{primaryLanguage}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {mentor.years_experience}y
                </span>
              </div>

              <div className="flex items-center gap-1 text-sm mt-1">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                <span className="font-medium">{Number(mentor.rating_avg).toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">
                  ({mentor.total_reviews})
                </span>
              </div>
            </div>
          </div>

          {mentor.headline && (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
              {mentor.headline}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <BookMarked className="mr-1 h-3 w-3" />
              {mentor.totalAvailable} slot{mentor.totalAvailable !== 1 ? "s" : ""} {dateLabel.toLowerCase()}
            </Badge>
          </div>

          <div className="mt-3 space-y-2">
            {mentor.availableSlots.map((slot, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2"
              >
                <span className="text-sm font-medium">{slot.label}</span>
                <Button
                  size="sm"
                  onClick={() => handleBook(slot)}
                  className="shrink-0"
                >
                  Book
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <BookingConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mentorId={mentor.user_id}
        mentorName={mentor.profile?.full_name || "Mentor"}
        slot={bookingSlot!}
        date={selectedDate}
        durationMins={25}
        language={primaryLanguage}
      />
    </>
  );
}
