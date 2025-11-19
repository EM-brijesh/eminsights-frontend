'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AnalyseButton({ collectionName }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyseCollection = async () => {
    if (!collectionName) {
      setError('Collection name is missing');
      console.error('Collection name is missing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/analyse/${collectionName}`;
      console.log('Calling analysis API:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || response.statusText || 'Unknown error';
        console.error('Error analysing collection:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg,
          url,
          collectionName,
        });
        setError(errorMsg);
        alert(`Analysis failed: ${errorMsg}`);
        return;
      }

      const data = await response.json();
      if (process.env.NODE_ENV !== 'production') {
        console.log('Analysis result:', data);
      }
      
      // Navigate to analytics page focusing this collection
      router.push(`/analytics?collection=${encodeURIComponent(collectionName)}`);
    } catch (err) {
      console.error('Error in analyseCollection:', err);
      setError(err.message);
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={analyseCollection}
        disabled={loading}
        className="text-2xl font-bold bg-gray-200 rounded-md py-2 px-4 cursor-pointer text-black hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Analysing...' : 'Analyse'}
      </button>
      {error && (
        <span className="text-red-400 text-sm">{error}</span>
      )}
    </div>
  );
}
