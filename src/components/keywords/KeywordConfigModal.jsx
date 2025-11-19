import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
const mockChannels = [];

export default function KeywordConfigModal({ keyword, onClose }) {
  const [groupName, setGroupName] = useState(keyword?.groupName || '');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [queryType, setQueryType] = useState('and');
  const [includedKeywords, setIncludedKeywords] = useState([]);
  const [orKeywords, setOrKeywords] = useState([]);
  const [excludedKeywords, setExcludedKeywords] = useState([]);

  const toggleChannel = (channelId) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <Card className="bg-white dark:bg-gray-800 w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Real Time Keywords Configuration
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Name and Channels */}
              <div className="space-y-6">
                {/* Keywords Group Name */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Name Your Keywords Group
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Add a title that explains the purpose of the Keywords group.
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Keywords Group Name *"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      maxLength={30}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">
                      0/30
                    </span>
                  </div>
                </div>

                {/* Pick Channels */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Pick Your Channels
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Select at least one network to listen to.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {mockChannels.map((channel) => (
                      <Card
                        key={channel.id}
                        className={`p-4 cursor-pointer transition-all ${
                          selectedChannels.includes(channel.id)
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:border-gray-400'
                        }`}
                        onClick={() => toggleChannel(channel.id)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {channel.icon === 'twitter' && (
                              <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                              </div>
                            )}
                            {channel.icon === 'facebook' && (
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                              </div>
                            )}
                            {channel.icon === 'instagram' && (
                              <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                                  <path d="M12 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                              </div>
                            )}
                            {!['twitter', 'facebook', 'instagram'].includes(channel.icon) && (
                              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                                <span className="text-xs text-white font-bold">{channel.name.charAt(0)}</span>
                              </div>
                            )}
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                              {channel.name}
                            </span>
                          </div>
                          <input
                            type="radio"
                            checked={selectedChannels.includes(channel.id)}
                            onChange={() => {}}
                            className="text-blue-600"
                          />
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {channel.subcategories.join(', ')}
                        </div>

                        {channel.subcategories.some(sub => sub.includes('captured') || sub.includes('only') || sub.includes('targeted')) && (
                          <div className="mt-2 text-xs text-orange-600">
                            {channel.subcategories.find(sub => sub.includes('captured') || sub.includes('only') || sub.includes('targeted'))}
                          </div>
                        )}

                        {['forum', 'news', 'blogs'].includes(channel.icon) && (
                          <div className="mt-2 flex items-center justify-center">
                            <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded">
                              <span className="text-2xl">😊</span>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Query Builder */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Configure Keywords Query
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Add keyword seperated by pressing 'Enter' to get results in the feed
                  </p>

                  {/* Query Type Tabs */}
                  <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setQueryType('basic')}
                      className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                        queryType === 'basic'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500'
                      }`}
                    >
                      Basic Query Builder
                    </button>
                    <button
                      onClick={() => setQueryType('advance')}
                      className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                        queryType === 'advance'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500'
                      }`}
                    >
                      Advance Query Builder
                    </button>
                  </div>

                  {/* Included Keywords (AND) */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Included Keywords (AND)*
                    </label>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2">
                        <input type="radio" name="includeType" value="and" defaultChecked className="text-blue-600" />
                        <span className="text-sm">AND</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" name="includeType" value="or" className="text-blue-600" />
                        <span className="text-sm">OR</span>
                      </label>
                    </div>
                    <button className="mt-2 text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      Add New Keyword
                    </button>
                  </div>

                  {/* Included Keywords (OR) */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Included Keywords (OR)*
                    </label>
                    <button className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      Add New Keyword
                    </button>
                  </div>

                  {/* Excluded Keywords (NOT) */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Excluded Keywords (NOT)*
                    </label>
                    <button className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      Add New Keyword
                    </button>
                  </div>

                  {/* Select Countries */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Countries
                    </label>
                    <input
                      type="text"
                      placeholder="Select Countries"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Select Language */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Language
                    </label>
                    <input
                      type="text"
                      placeholder="Select Language"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Save
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

