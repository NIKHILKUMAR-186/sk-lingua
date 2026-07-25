import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStudentAnalytics } from "@/hooks/use-analytics";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function StudentAnalyticsDashboard() {
  const { data: auth } = useAuth();
  const userId = auth?.user?.id;
  const { data, isLoading } = useStudentAnalytics(userId);

  if (!userId) return null;

  return (
    <AppShell variant="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-display">Learning Analytics</h1>
          <p className="text-sm text-muted-foreground">Track your learning progress and achievements.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent>
            <div className="text-sm text-muted-foreground">Learning hours</div>
            <div className="text-2xl font-semibold">{isLoading ? '—' : (data?.learningHours ?? 0).toFixed(1)}</div>
          </CardContent></Card>
          <Card><CardContent>
            <div className="text-sm text-muted-foreground">Sessions completed</div>
            <div className="text-2xl font-semibold">{isLoading ? '—' : data?.sessionsCompleted ?? 0}</div>
          </CardContent></Card>
          <Card><CardContent>
            <div className="text-sm text-muted-foreground">Homework completion</div>
            <div className="text-2xl font-semibold">{isLoading ? '—' : `${data?.homeworkCompletionPct ?? 0}%`}</div>
          </CardContent></Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Weekly Activity</CardTitle></CardHeader>
            <CardContent style={{ height: 240 }}>
              {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={(data?.weeklyActivity ?? []).map((d:any,i:number) => ({ name: `Day ${i+1}`, value: d.count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>XP & Streaks</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">XP</div>
                <div className="text-2xl font-semibold">{isLoading ? '—' : data?.xpTotal ?? 0}</div>
                <div className="text-sm text-muted-foreground">Current streak: {isLoading ? '—' : data?.currentStreak}</div>
                <div className="text-sm text-muted-foreground">Longest streak: {isLoading ? '—' : data?.longestStreak}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
