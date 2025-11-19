'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Label } from '@/components/ui/label';

export default function CreateUserPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!username || !email || !password) {
      setError('Username, email, and password are required');
      return;
    }
    setLoading(true);
    try {
      await api.users.create({ username, email, password });
      setSuccess('User created');
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h1 className="text-xl font-semibold text-white mb-4">Create User</h1>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      {success && <p className="text-sm text-green-400 mb-3">{success}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="username" className="text-white mb-2 block">Username *</Label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Username *"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-white mb-2 block">Email *</Label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email *"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-white mb-2 block">Password *</Label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-semibold ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-white text-black hover:bg-white/90'}`}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-gray-700 text-white hover:bg-gray-800"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}


