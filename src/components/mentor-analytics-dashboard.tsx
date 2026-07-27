import { useAuth } from "@/hooks/use-auth";
import { useMentorAnalytics } from "@/hooks/use-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MentorAnalyticsDashboard() {
  const { data: auth } = useAuth();
  const mentorId = auth?.user?.id;
  const { data, isLoading } = useMentorAnalytics(mentorId);

  if (!mentorId) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-display">Mentor Analytics</h1>
        <p className="text-sm text-muted-foreground">Overview of teaching performance and activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent>
          <div className="text-sm text-muted-foreground">Today's sessions</div>
          <div className="text-2xl font-semibold">{isLoading ? '—' : data?.todays ?? 0}</div>
        </CardContent></Card>
        <Card><CardContent>
          <div className="text-sm text-muted-foreground">Monthly sessions</div>
          <div className="text-2xl font-semibold">{isLoading ? '—' : data?.monthly ?? 0}</div>
        </CardContent></Card>
        <Card><CardContent>
          <div className="text-sm text-muted-foreground">Average rating</div>
          <div className="text-2xl font-semibold">{isLoading ? '—' : (data?.avgRating ?? 0).toFixed(1)}</div>
        </CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Students & Repeat Students</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Students taught: {isLoading ? '—' : data?.students ?? 0}</div>
            <div className="text-sm text-muted-foreground">Repeat students: {isLoading ? '—' : data?.repeatStudents ?? 0}</div>
            <div className="text-sm text-muted-foreground">Homework reviewed: {data?.homeworkReviewed ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Completion & Resources</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Completion rate: {isLoading ? '—' : `${data?.completionRate ?? 0}%`}</div>
            <div className="text-sm text-muted-foreground">Resources shared: {isLoading ? '—' : data?.resourcesShared ?? 0}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
