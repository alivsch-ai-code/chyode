'use client';

import { TripForm } from '@/components/TripForm';
import { PageLoading } from '@/components/ui/Feedback';
import { useRequireAuth } from '@/lib/auth';

export default function CreateTripPage() {
  const { allowed } = useRequireAuth();
  if (!allowed) return <PageLoading />;

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <header className="mb-8">
        <p className="eyebrow">Neue Reise</p>
        <h1 className="mt-1 text-title1 sm:text-[2.25rem]">Reise planen</h1>
      </header>
      <TripForm />
    </div>
  );
}
