'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Plus, RefreshCw, Trash2, Play, KeyRound, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DottedBackground from '@/components/DottedBackground';
import api from '@/lib/api';

const CHANNELS = [
  { key: 'twitter', label: 'Twitter', icon: '/x-logo.svg', type: 'social' },
  { key: 'facebook', label: 'Facebook', icon: '/facebook-logo.svg', type: 'social' },
  { key: 'instagram', label: 'Instagram', icon: '/instagram-logo.svg', type: 'social' },
  { key: 'youtube', label: 'YouTube', icon: '/youtube-logo.svg', type: 'social' },
  { key: 'reddit', label: 'Reddit', icon: '/reddit-logo.svg', type: 'social' },
  // premium/demo entries
  { key: 'tiktok', label: 'TikTok', icon: '', type: 'premium' },
  { key: 'telegram', label: 'Telegram', icon: '', type: 'premium' },
];

function StatChip({ value, label }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-black border border-white/10 text-white text-xs">
      <span className="font-semibold text-sm">{value}</span>
      <span className="text-gray-400">{label}</span>
    </span>
  );
}

export default function ChannelConfigPage() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [profiles, setProfiles] = useState([]); // demo per brand
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all'); // all | social | premium

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const data = await api.brands.getAll();
        const list = data.brands || [];
        setBrands(list);
        if (list.length) setSelectedBrand(list[0].brandName);
      } catch (e) {
        // silent; page still usable with demo data
      }
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    if (!selectedBrand) return;
    (async () => {
      try {
        const data = await api.channels.list(selectedBrand);
        setProfiles(Array.isArray(data?.profiles) ? data.profiles : []);
      } catch (e) {
        // Fallback demo data if backend not ready
        setProfiles([
          {
            id: 'fb_1',
            channel: 'facebook',
            name: 'Siddhitestloco',
            owned: true,
            updatedAt: new Date().toISOString(),
            types: ['User Comments', 'Messages', 'User Post', 'Mentioned Comment', 'Dark Post', 'Public Comment'],
          },
          {
            id: 'ig_1',
            channel: 'instagram',
            name: 'BrandIG',
            owned: true,
            updatedAt: new Date().toISOString(),
            types: ['User Comments', 'Public Comment'],
          },
        ]);
      }
    })();
  }, [selectedBrand]);

  const stats = useMemo(() => {
    const social = profiles.length;
    const other = 0;
    return {
      social: `${social} / ${social}`,
      other: `${other} / ${other}`,
    };
  }, [profiles]);

  const visibleChannels = CHANNELS.filter(c => filter === 'all' ? true : c.type === filter);

  const connectChannel = async (ch) => {
    setShowAdd(false);
    if (!selectedBrand) return;
    try {
      const res = await api.channels.connect({ brandName: selectedBrand, channel: ch.key });
      if (res?.authUrl) {
        window.location.href = res.authUrl; // OAuth redirect
        return;
      }
      // If direct connect
      const data = await api.channels.list(selectedBrand);
      setProfiles(Array.isArray(data?.profiles) ? data.profiles : []);
    } catch (e) {
      alert(`Connection failed: ${e.message}`);
    }
  };

  const handleReauth = async (p) => {
    try {
      const res = await api.channels.reauthorize({ brandName: selectedBrand, profileId: p.id });
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (e) {
      alert(`Reauthorize failed: ${e.message}`);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm('Delete this profile?')) return;
    try {
      await api.channels.remove({ brandName: selectedBrand, profileId: p.id });
      setProfiles(prev => prev.filter(x => x.id !== p.id));
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const ProfileCard = ({ p }) => {
    const channel = CHANNELS.find(c => c.key === p.channel);
    return (
      <div className="p-4 bg-black border border-white/10 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 border border-white/10 overflow-hidden">
            {channel?.icon ? (
              <Image src={channel.icon} alt={channel.label} width={16} height={16} />
            ) : (
              <span className="text-xs text-gray-300">{(channel?.label || '?').slice(0,1)}</span>
            )}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-white truncate">{p.name}</div>
              {p.owned && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-900/30 text-emerald-300 border border-emerald-700/50">Owned</span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">Last Updated On: {new Date(p.updatedAt).toLocaleString()}</div>
            <div className="flex flex-wrap gap-2 mt-3">
              {(p.types || []).map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-gray-900 border border-white/10 text-gray-200">{t}</span>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => handleReauth(p)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-gray-900 border border-white/10 hover:bg-gray-800 text-sm"><KeyRound className="w-4 h-4"/> Reauthorize</button>
              <button onClick={() => handleDelete(p)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-gray-900 border border-white/10 hover:bg-gray-800 text-sm text-red-300"><Trash2 className="w-4 h-4"/> Delete</button>
              <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white text-black hover:bg-white/90 text-sm"><Play className="w-4 h-4"/> Start</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 relative">
      <DottedBackground />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Channel Configuration</h1>
          <div className="flex items-center gap-3">
            <StatChip value={stats.social} label="Active Social Profiles/Total" />
            <StatChip value={stats.other} label="Active Other Profiles/Total" />
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-white text-black hover:bg-white/90"><Plus className="w-4 h-4"/> Add Channel</button>
          </div>
        </div>

        {/* Brand selector + filter */}
        <Card className="border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300">Select Brand</label>
                <div className="relative">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-56 px-3 py-2 bg-gray-900 border border-white/10 rounded-md text-white appearance-none pr-8"
                  >
                    {brands.map(b => (
                      <option key={b._id} value={b.brandName} className="bg-black text-white">{b.brandName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-md text-sm ${filter==='all'?'bg-white text-black':'bg-gray-900 text-gray-300'}`}>All</button>
                <button onClick={() => setFilter('social')} className={`px-3 py-1.5 rounded-md text-sm ${filter==='social'?'bg-white text-black':'bg-gray-900 text-gray-300'}`}>Social</button>
                <button onClick={() => setFilter('premium')} className={`px-3 py-1.5 rounded-md text-sm ${filter==='premium'?'bg-white text-black':'bg-gray-900 text-gray-300'}`}>Premium</button>
                <button className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-900 border border-white/10 hover:bg-gray-800 text-sm"><RefreshCw className="w-4 h-4"/> Refresh</button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profiles list grouped (example Facebook & Instagram) */}
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 border border-white/10">
                  <Image src="/facebook-logo.svg" alt="Facebook" width={16} height={16} />
                </span>
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 border border-white/10">
                  <Image src="/instagram-logo.svg" alt="Instagram" width={16} height={16} />
                </span>
                <span>Facebook & Instagram Profiles ({profiles.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {profiles.map(p => (
                  <ProfileCard key={p.id} p={p} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Channel Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
          <div className="relative z-10 max-w-3xl w-[95vw] mx-auto mt-24 bg-black border border-white/10 rounded-xl p-6" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Social Media Channels</div>
              <button className="text-gray-400 hover:text-white" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {visibleChannels.map(ch => (
                <button key={ch.key} onClick={() => connectChannel(ch)} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-900 border border-white/10 hover:bg-gray-800">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-950 border border-white/10 overflow-hidden">
                    {ch.icon ? (
                      <Image src={ch.icon} alt={ch.label} width={20} height={20} />
                    ) : (
                      <span className="text-sm text-gray-300">{ch.label.slice(0,1)}</span>
                    )}
                  </span>
                  <span className="text-sm">{ch.label}</span>
                </button>
              ))}
            </div>
            {filter==='all' && (
              <>
                <div className="mt-6 text-sm text-gray-400">Premium Channels</div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {CHANNELS.filter(c=>c.type==='premium').map(ch => (
                    <button key={ch.key} onClick={() => connectChannel(ch)} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-900 border border-white/10 hover:bg-gray-800">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-950 border border-white/10">
                        <span className="text-sm text-gray-300">{ch.label.slice(0,1)}</span>
                      </span>
                      <span className="text-sm">{ch.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


