'use client';

import { useParams } from 'next/navigation';
import { ResultsDashboard } from '@/components/ResultsDashboard';

export default function TripResultsPage() {
  const { tripId } = useParams<{ tripId: string }>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ergebnis-Dashboard</h1>
      <ResultsDashboard tripId={tripId} />
    </div>
  );
}
