import React, { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/mentor/availability')({ component: MentorAvailability });

function MentorAvailability() {
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<any>({ working_days: [], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const client = (supabase as any);
      const { data } = await client.from('mentor_availability').select('*').maybeSingle();
      if (!mounted) return;
      if (data) setAvailability(data);
    })();
    return () => { mounted = false; };
  }, []);

  async function save() {
    setLoading(true);
    try {
      const payload = { ...availability };
      const client = (supabase as any);
      await client.from('mentor_availability').upsert(payload, { onConflict: 'user_id' });
      toast.success('Availability saved');
    } catch (err: any) { toast.error(err?.message ?? String(err)); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">Availability</h1>
        <div className="mt-4">
          <label className="block text-sm mb-2">Timezone</label>
          <Input value={availability.timezone || ''} onChange={(e:any) => setAvailability((s:any)=>({...s, timezone: e.target.value}))} />
        </div>
        <div className="mt-4">
          <label className="block text-sm mb-2">Working days (comma separated e.g. mon,tue)</label>
          <Input value={(availability.working_days || []).join(',')} onChange={(e:any) => setAvailability((s:any)=>({...s, working_days: e.target.value.split(',').map((x:string)=>x.trim()).filter(Boolean)}))} />
        </div>
        <div className="mt-6">
          <Button onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save availability'}</Button>
        </div>
      </div>
    </div>
  );
}
