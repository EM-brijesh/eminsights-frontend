	'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import WordCloud from './WordCloud';

// Locobuzz-style professional colors
const COLORS = {
  positive: '#10B981',  // Green
  neutral: '#F59E0B',   // Orange/Yellow
  negative: '#EF4444',  // Red
  chart: ['#10B981', '#F59E0B', '#EF4444'] // For pie chart mapping
};

export default function Report({ analysis, collectionName }) {
  if (!Array.isArray(analysis) || analysis.length === 0) {
    return <div>No analysis data to display.</div>;
  }

  // Support both old and new shapes
  const first = analysis[0] || {};
  const hasNewSchema = !!first.languages || !!first.summary;

  const topEngagers = first.topEngagers || [];
  const contentThemes = hasNewSchema ? (first.languages?.en?.themes || first.languages?.hi?.themes || first.languages?.mr?.themes || []) : first.contentThemes;

  // Pie data (overall sentiment)
  const overall = first.summary?.overallDistribution;
  const narrative = first.summary?.narrative;
  const highlights = first.summary?.highlights || [];
  const recommendations = first.summary?.recommendations || [];
  const oldSentiment = first.sentimentDistribution;
  const pieData = overall
    ? Object.entries(overall).map(([k, v]) => ({ name: k, value: Number(v) || 0 }))
    : oldSentiment
      ? Object.entries(oldSentiment).map(([key, value]) => ({ name: key, value: (Array.isArray(value) ? value.length : Number(value) || 0) }))
      : [];

  // Collect top 10 comments across languages by highest confidence
  const languages = first.languages || {};
  const langKeys = Object.keys(languages);
  const allSamples = [];
  langKeys.forEach(lang => {
    const samples = languages[lang]?.samplePosts || [];
    samples.forEach(s => {
      if (s?.text) {
        allSamples.push({
          text: s.text,
          sentiment: s.sentiment,
          confidence: Number(s.confidence) || 0,
          lang,
        });
      }
    });
  });
  allSamples.sort((a, b) => b.confidence - a.confidence);

  // Manual override state: key by unique text snippet
  const [overridesByText, setOverridesByText] = useState(first?.overrides || {});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Keep local overrides in sync if analysis prop changes (e.g., after reload)
  const initialOverrides = first?.overrides || {};
  const initialOverridesKey = JSON.stringify(initialOverrides);
  useEffect(() => {
    setOverridesByText(initialOverrides);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOverridesKey]);

  // Apply overrides to samples
  const samplesWithOverrides = useMemo(() => {
    return allSamples.map(s => {
      const key = s.text;
      const override = overridesByText[key];
      return override ? { ...s, sentiment: override } : s;
    });
  }, [allSamples, overridesByText]);

  // Compute pie data from samples if available; otherwise fall back to API provided distribution
  const computedDistribution = useMemo(() => {
    if (!samplesWithOverrides.length) return null;
    const counts = { positive: 0, neutral: 0, negative: 0 };
    samplesWithOverrides.forEach(s => {
      if (s.sentiment === 'positive') counts.positive += 1;
      else if (s.sentiment === 'negative') counts.negative += 1;
      else counts.neutral += 1;
    });
    return counts;
  }, [samplesWithOverrides]);

  const effectivePieData = computedDistribution
    ? Object.entries(computedDistribution).map(([name, value]) => ({ name, value }))
    : pieData;

  // Show all comments (not just top 10)
  const displayedComments = samplesWithOverrides;

  async function handleSaveOverrides() {
    if (!collectionName) {
      setSaveMsg('Missing collection name.');
      return;
    }
    try {
      setSaving(true);
      setSaveMsg('');
      const res = await fetch(`/api/collections/${collectionName}/analysis`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: overridesByText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Save failed (${res.status})`);
      }
      setSaveMsg('Saved');
    } catch (e) {
      setSaveMsg(e.message || 'Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 2000);
    }
  }

  return (
    <div className="space-y-12">
      {/* AI Summary of Comments */}
      {(narrative || highlights.length || recommendations.length) && (
        <section className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700/50">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent mb-6 flex items-center gap-3">
            <svg className="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Summary of Comments
          </h2>
          {narrative && (
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 mb-6">
              <p className="text-gray-100 text-base leading-relaxed">{narrative}</p>
            </div>
          )}
          {highlights.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-xl text-white mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Key Highlights
              </h3>
              <ul className="space-y-3">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3 p-4 bg-green-900/20 border border-green-700/30 rounded-lg hover:bg-green-900/30 transition-colors">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-gray-200 text-sm leading-relaxed">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recommendations.length > 0 && (
            <div>
              <h3 className="font-bold text-xl text-white mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Recommendations
              </h3>
              <ul className="space-y-3">
                {recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg hover:bg-blue-900/30 transition-colors">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-gray-200 text-sm leading-relaxed">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
      {/* Sentiment Distribution (Pie Chart) */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
            📊 Sentiment Distribution
          </h2>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSaveOverrides}
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving…
                </span>
              ) : (
                'Save Overrides'
              )}
            </button>
            {saveMsg && (
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                saveMsg === 'Saved' 
                  ? 'bg-green-900/30 text-green-400 border border-green-700' 
                  : 'bg-red-900/30 text-red-400 border border-red-700'
              }`}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pie Chart */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={effectivePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={140}
                  innerRadius={70}
                  labelLine={{
                    stroke: '#9ca3af',
                    strokeWidth: 1,
                  }}
                  label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}
                  paddingAngle={3}
                  animationDuration={800}
                >
                  {effectivePieData.map((entry, index) => {
                    const colorMap = {
                      'positive': COLORS.positive,
                      'neutral': COLORS.neutral,
                      'negative': COLORS.negative,
                    };
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={colorMap[entry.name] || COLORS.chart[index % COLORS.chart.length]}
                        stroke="#1f2937"
                        strokeWidth={3}
                      />
                    );
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                    padding: '12px 16px',
                  }}
                  itemStyle={{
                    color: '#e5e7eb',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                  labelStyle={{
                    color: '#ffffff',
                    fontWeight: '700',
                    marginBottom: '8px',
                    textTransform: 'capitalize',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Sentiment Stats Cards */}
          <div className="space-y-4">
            {effectivePieData.map((item, idx) => {
              const total = effectivePieData.reduce((sum, d) => sum + d.value, 0);
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
              
              const colorMap = {
                'positive': {
                  bg: 'from-green-900/40 to-green-800/30',
                  border: 'border-green-600/50',
                  dot: 'bg-green-500',
                  text: 'text-green-400',
                  ring: 'ring-green-500/20',
                },
                'neutral': {
                  bg: 'from-yellow-900/40 to-yellow-800/30',
                  border: 'border-yellow-600/50',
                  dot: 'bg-yellow-500',
                  text: 'text-yellow-400',
                  ring: 'ring-yellow-500/20',
                },
                'negative': {
                  bg: 'from-red-900/40 to-red-800/30',
                  border: 'border-red-600/50',
                  dot: 'bg-red-500',
                  text: 'text-red-400',
                  ring: 'ring-red-500/20',
                },
              };

              const style = colorMap[item.name] || colorMap['neutral'];

              return (
                <div 
                  key={idx} 
                  className={`p-5 bg-gradient-to-br ${style.bg} border ${style.border} rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group ring-2 ${style.ring} hover:ring-4`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${style.dot} shadow-lg ring-2 ring-white/20`}></div>
                      <span className="text-sm font-bold text-white uppercase tracking-wider">
                        {item.name}
                      </span>
                    </div>
                    <div className="px-3 py-1 bg-gray-900/50 rounded-full">
                      <span className={`text-xs font-bold ${style.text}`}>
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <div className={`text-3xl font-bold ${style.text} group-hover:scale-110 transition-transform`}>
                    {item.value.toLocaleString()}
                  </div>
                  <div className="mt-2 text-xs text-gray-400 font-medium">
                    mentions
                  </div>
                </div>
              );
            })}

            {/* Total Count Card */}
            <div className="p-5 bg-gradient-to-br from-blue-900/40 to-indigo-800/30 border border-blue-600/50 rounded-xl ring-2 ring-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg ring-2 ring-white/20"></div>
                <span className="text-sm font-bold text-white uppercase tracking-wider">
                  Total
                </span>
              </div>
              <div className="text-3xl font-bold text-blue-400">
                {effectivePieData.reduce((sum, d) => sum + d.value, 0).toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-gray-400 font-medium">
                total mentions
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Word Cloud */}
      {first.keywordFrequency && (
        <section className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700/50">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent mb-6 flex items-center gap-3">
            ☁️ Keyword Word Cloud
          </h2>
          <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/30">
            <WordCloud keywordFrequency={first.keywordFrequency} />
          </div>
        </section>
      )}

      {/* All Comments */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700/50">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent mb-6 flex items-center gap-3">
          <svg className="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          All Comments
        </h2>
        {displayedComments.length ? (
          <ul className="space-y-4">
            {displayedComments.map((c, i) => {
              const sentimentColors = {
                positive: {
                  bg: 'bg-green-600/90',
                  border: 'border-green-500',
                  ring: 'ring-green-500/20',
                  gradient: 'from-green-900/30 to-green-800/20',
                },
                neutral: {
                  bg: 'bg-yellow-600/90',
                  border: 'border-yellow-500',
                  ring: 'ring-yellow-500/20',
                  gradient: 'from-yellow-900/30 to-yellow-800/20',
                },
                negative: {
                  bg: 'bg-red-600/90',
                  border: 'border-red-500',
                  ring: 'ring-red-500/20',
                  gradient: 'from-red-900/30 to-red-800/20',
                },
              };
              
              const colors = sentimentColors[c.sentiment] || sentimentColors.neutral;
              
              return (
                <li 
                  key={i} 
                  className={`p-5 bg-gradient-to-br ${colors.gradient} rounded-xl border ${colors.border} hover:shadow-xl transition-all duration-300 ring-2 ${colors.ring} hover:ring-4`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-600 text-white font-bold text-sm">
                        {i + 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-300 px-2 py-1 bg-gray-800/50 rounded-full">
                        Lang: {c.lang.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/50 rounded-full">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-bold text-white">
                        {(c.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-100 leading-relaxed mb-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    {c.text}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg ${colors.bg} text-white shadow-lg`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        {c.sentiment === 'positive' && <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />}
                        {c.sentiment === 'negative' && <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />}
                        {c.sentiment === 'neutral' && <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />}
                      </svg>
                      {c.sentiment.charAt(0).toUpperCase() + c.sentiment.slice(1)}
                    </span>
                    <select
                      className="flex-1 bg-gray-800 text-sm text-gray-100 rounded-lg px-4 py-2 border-2 border-gray-700 hover:border-gray-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all cursor-pointer font-medium"
                      value={c.sentiment}
                      onChange={(e) => {
                        const next = e.target.value;
                        setOverridesByText(prev => ({ ...prev, [c.text]: next }));
                      }}
                    >
                      <option value="positive">✓ Positive</option>
                      <option value="neutral">― Neutral</option>
                      <option value="negative">✗ Negative</option>
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/30">
            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-400 text-sm">No comments available</p>
          </div>
        )}
      </section>

      {/* Top Engagers */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700/50">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent mb-6 flex items-center gap-3">
          <svg className="w-8 h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Top Engagers
        </h2>
        {(topEngagers || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(topEngagers || []).map((engager, index) => (
              <div 
                key={index} 
                className="p-6 bg-gradient-to-br from-blue-900/30 to-indigo-900/20 rounded-xl border border-blue-700/30 hover:border-blue-600/50 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-4 ring-blue-500/20 group-hover:ring-8 transition-all">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2 group-hover:text-sky-400 transition-colors">
                      {engager.channelTitle}
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed bg-gray-800/30 p-3 rounded-lg">
                      {engager.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/30">
            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-400 text-sm">No top engagers data available</p>
          </div>
        )}
      </section>

      {/* Removed Content Themes in favor of AI Summary of Comments */}

    </div>
  );
}