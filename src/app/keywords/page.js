import { Suspense } from 'react';
import KeywordsPageClient from './KeywordsPageClient';

export default function KeywordsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-sm text-gray-400">Loading keywords</div>
        </div>
      }
    >
      <KeywordsPageClient />
    </Suspense>
  );
}
