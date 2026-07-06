export const unstable_instant = {
  prefetch: 'runtime',
  samples: [
    {
      params: { id: 'gH2xK9w8' },
      searchParams: {
        recipient: null,
        reveal: null,
        timelapse: null
      }
    }
  ]
};

import { Suspense } from 'react';
import GiftPageContent from './GiftPageContent';
import { getAmbigramById } from '@/lib/db';

export default async function VisitorGiftPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', opacity: 0.3 }}>
        loading...
      </div>
    }>
      {params.then(async ({ id }) => {
        const ambigram = await getAmbigramById(id);
        return <GiftPageContent initialItem={ambigram} artId={id} />;
      })}
    </Suspense>
  );
}
