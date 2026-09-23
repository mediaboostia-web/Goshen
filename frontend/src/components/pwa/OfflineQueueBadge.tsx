'use client';

import { useEffect, useState } from 'react';
import { CloudSyncIcon } from '@/components/icons/ChurchIcons';
import { getQueuedCount, onQueueChange } from '@/lib/offlineQueue';

// Makes the offline write queue visible: without this, a treasurer who
// entered an offering with no network has no way to check whether it's
// still waiting to sync short of watching for the one-shot toast at the
// moment connectivity returns (see PwaRegister). Hidden entirely when the
// queue is empty — this is not a permanent UI element.
export function OfflineQueueBadge() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    setCount(getQueuedCount());
    return onQueueChange(() => setCount(getQueuedCount()));
  }, []);

  if (count === 0) return null;

  return (
    <div
      className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-800"
      title={`${count} saisie${count > 1 ? 's' : ''} hors ligne en attente de synchronisation`}
    >
      <CloudSyncIcon className="h-4 w-4 shrink-0" />
      <span className="hidden text-xs font-semibold sm:inline">{count} en attente</span>
      <span className="text-xs font-semibold sm:hidden">{count}</span>
    </div>
  );
}
