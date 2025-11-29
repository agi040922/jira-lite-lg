'use client';

import AppLayout from '@/components/AppLayout';
import TrashWithDB from '@/components/TrashWithDB';

export default function TrashPage() {
  return (
    <AppLayout currentView="trash" title="Trash">
      <TrashWithDB />
    </AppLayout>
  );
}
