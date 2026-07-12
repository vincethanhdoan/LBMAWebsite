import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { SlotSettings } from './availability/SlotSettings';
import { BlockedDates } from './availability/BlockedDates';
import { NotificationRecipients } from './availability/NotificationRecipients';
import { getBlockedDates } from '../../lib/supabase/queries';
import type { BlockedDate } from '../../lib/types';

export function AdminAvailabilitySettings() {
  const [blocks, setBlocks] = useState<BlockedDate[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);

  const loadBlocks = useCallback(async () => {
    setBlocks(await getBlockedDates());
  }, []);

  useEffect(() => {
    async function load() {
      try {
        await loadBlocks();
      } catch {
        toast.error('Failed to load blocked dates');
      } finally {
        setLoadingBlocks(false);
      }
    }
    load();
  }, [loadBlocks]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Availability</h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          When families can book tour appointments, and who hears about new
          inquiries.
        </p>
      </div>
      <SlotSettings />
      <BlockedDates
        blocks={blocks}
        loading={loadingBlocks}
        onRefetch={loadBlocks}
      />
      <NotificationRecipients />
    </div>
  );
}
