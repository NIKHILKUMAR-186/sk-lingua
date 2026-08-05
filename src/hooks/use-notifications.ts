import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useNotifications() {
  const qc = useQueryClient();
  const client = (supabase as any);
  const q = useQuery({ queryKey: ['notifications'], queryFn: async () => (await client.from('notifications').select('*').order('created_at', { ascending: false })).data ?? [] });

  async function markRead(id: string) {
    await client.from('notifications').update({ is_read: true }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  return { notifications: q.data ?? [], isLoading: q.isLoading, markRead };
}
