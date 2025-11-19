'use client';

import { useState } from 'react';

export default function TestAPI() {
  const [result, setResult] = useState('');

  const testDirect = async () => {
    try {
      const response = await fetch('http://localhost:5000/health');
      const data = await response.json();
      setResult('✅ Direct fetch works: ' + JSON.stringify(data));
    } catch (error) {
      setResult('❌ Direct fetch failed: ' + error.message);
    }
  };

  const testAPI = async () => {
    try {
      const api = await import('@/lib/api');
      setResult('API_BASE_URL: ' + api.API_BASE_URL);
    } catch (error) {
      setResult('❌ API import failed: ' + error.message);
    }
  };

  const testCreate = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/brands/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: 'Test ' + Date.now(),
          description: 'Test',
          frequency: '30m'
        })
      });
      const data = await response.json();
      setResult('✅ Create works: ' + JSON.stringify(data));
    } catch (error) {
      setResult('❌ Create failed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">API Connection Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={testAPI}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          1. Check API_BASE_URL
        </button>
        
        <button
          onClick={testDirect}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg ml-4"
        >
          2. Test Health Endpoint
        </button>
        
        <button
          onClick={testCreate}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg ml-4"
        >
          3. Test Brand Creation
        </button>
      </div>

      {result && (
        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h2 className="font-bold mb-2">Environment Check:</h2>
        <p>NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL || 'NOT SET'}</p>
        <p>Expected: http://localhost:5000</p>
      </div>
    </div>
  );
}

