import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function ApplicationTimeline({ applicationId }: { applicationId: string }) {
  const client = (supabase as any);
  const { data: histories = [] } = useQuery({ queryKey: ['application-histories', applicationId], queryFn: async () => (await client.from('mentor_application_status_history').select('*').eq('application_id', applicationId).order('created_at', { ascending: true })).data ?? [] });
  const { data: interviews = [] } = useQuery({ queryKey: ['application-interviews', applicationId], queryFn: async () => (await client.from('mentor_application_interviews').select('*').eq('application_id', applicationId).order('scheduled_time', { ascending: true })).data ?? [] });
  const adminClient = (supabase as any);
  const { data: audits = [] } = useQuery({ queryKey: ['application-audits', applicationId], queryFn: async () => (await adminClient.from('audit_logs').select('*').or(`details->>application_id.eq.${applicationId}, details->>application_id.eq."${applicationId}"`).order('created_at', { ascending: true })).data ?? [] });

  // Merge and sort
  const items: any[] = [];
  histories.forEach((h: any) => items.push({ type: 'status', time: h.created_at, payload: h }));
  interviews.forEach((i: any) => items.push({ type: 'interview', time: i.scheduled_time, payload: i }));
  audits.forEach((a: any) => items.push({ type: 'audit', time: a.created_at, payload: a }));
  items.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  if (!applicationId) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Application timeline</h3>
      <div className="border-l pl-4">
        {items.length === 0 ? <div className="text-sm text-muted-foreground">No events yet.</div> : items.map((it, idx) => (
          <div key={idx} className="mb-4">
            <div className="text-xs text-muted-foreground">{new Date(it.time).toLocaleString()}</div>
            <div className="mt-1">
              {it.type === 'status' && <div><strong>Status:</strong> {it.payload.new_status}{it.payload.notes ? ` — ${it.payload.notes}` : ''}</div>}
              {it.type === 'interview' && <div><strong>Interview:</strong> {new Date(it.payload.scheduled_time).toLocaleString()} {it.payload.location ? `@ ${it.payload.location}` : ''}{it.payload.notes ? ` — ${it.payload.notes}` : ''}</div>}
              {it.type === 'audit' && <div><strong>Admin:</strong> {it.payload.action}{it.payload.details?.notes ? ` — ${it.payload.details.notes}` : ''}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
