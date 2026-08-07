import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Video,
  MessageSquare,
  Monitor,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface DemoWorkspaceProps {
  workspace: {
    id: string;
    booking_id: string;
    mentor_id: string;
    student_id: string;
    video_call_url: string | null;
    chat_enabled: boolean;
    screen_share_enabled: boolean;
    session_notes: string | null;
    status: string;
    started_at: string | null;
    ended_at: string | null;
  };
  currentUserId: string;
  userRole: "mentor" | "student";
  onCompleteSession?: () => void;
}

export function DemoWorkspace({
  workspace,
  currentUserId,
  userRole,
  onCompleteSession,
}: DemoWorkspaceProps) {
  const [chatMessage, setChatMessage] = useState("");
  const [sessionNotes, setSessionNotes] = useState(workspace.session_notes || "");
  const [isCompleting, setIsCompleting] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const isMentor = userRole === "mentor";
  const canStartSession = isMentor && workspace.status === "active" && !workspace.started_at;
  const canEndSession = isMentor && workspace.status === "active" && workspace.started_at;
  const canComplete = isMentor && workspace.status === "active";

  useEffect(() => {
    // Simulate real-time chat messages
    // In production, this would use Supabase Realtime
    const mockMessages = [
      {
        id: "1",
        sender_id: isMentor ? workspace.student_id : workspace.mentor_id,
        message: "Hi! I'm excited for this demo session.",
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(mockMessages);
  }, [workspace.student_id, workspace.mentor_id, isMentor]);

  async function handleStartSession() {
    // In production, update workspace started_at
    toast.success("Session started!");
    window.location.reload();
  }

  async function handleEndSession() {
    // In production, update workspace ended_at
    toast.success("Session ended!");
    window.location.reload();
  }

  async function handleCompleteSession() {
    if (!sessionNotes.trim()) {
      toast.error("Please add session notes before completing");
      return;
    }

    setIsCompleting(true);
    try {
      // In production, call completeDemoSession API
      toast.success("Demo session completed!");
      onCompleteSession?.();
    } catch (error) {
      toast.error("Failed to complete session");
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    // In production, send message via Supabase Realtime
    const newMessage = {
      id: Date.now().toString(),
      sender_id: currentUserId,
      message: chatMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, newMessage]);
    setChatMessage("");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">Demo Session Workspace</h1>
                <p className="text-sm text-muted-foreground">
                  {isMentor ? "Teaching" : "Learning"} session in progress
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {workspace.status === "active" && (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </Badge>
              )}
              {workspace.started_at && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  In Progress
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video & Screen Share */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video Call
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspace.video_call_url ? (
                <div className="aspect-video rounded-lg bg-black flex items-center justify-center">
                  <iframe
                    src={workspace.video_call_url}
                    className="h-full w-full rounded-lg"
                    allow="camera; microphone; screen-share"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-4">
                  <Video className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Video call will appear here</p>
                  {canStartSession && (
                    <Button onClick={handleStartSession} size="lg">
                      Start Session
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Screen Share Placeholder */}
          {workspace.screen_share_enabled && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Screen Share
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center">
                  <Monitor className="h-12 w-12 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Chat & Notes */}
        <div className="space-y-4">
          {/* Chat */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-64 overflow-y-auto rounded-lg border p-3 space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-2 text-sm ${
                          msg.sender_id === currentUserId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={!workspace.chat_enabled}
                  />
                  <Button type="submit" size="icon" disabled={!workspace.chat_enabled}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Session Notes (Mentor Only) */}
          {isMentor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Session Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Add notes about the session..."
                  rows={6}
                />
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {isMentor && (
            <Card>
              <CardContent className="p-4 space-y-2">
                {canStartSession && (
                  <Button onClick={handleStartSession} className="w-full">
                    Start Session
                  </Button>
                )}
                {canEndSession && (
                  <Button onClick={handleEndSession} variant="outline" className="w-full">
                    End Session
                  </Button>
                )}
                {canComplete && (
                  <Button
                    onClick={handleCompleteSession}
                    disabled={isCompleting || !sessionNotes.trim()}
                    className="w-full"
                  >
                    {isCompleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Complete Session
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
