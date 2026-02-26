'use client';

import { useMemo, useState } from 'react';

export default function WordCloud({ keywordFrequency, colorScheme = 'multiple' }) {
  const [hoveredWord, setHoveredWord] = useState(null);

  // Transform keywordFrequency object into format for rendering
  const words = useMemo(() => {
    if (!keywordFrequency || typeof keywordFrequency !== 'object') {
      return [];
    }

    const entries = Object.entries(keywordFrequency)
      .map(([text, value]) => ({
        text,
        value: value?.$numberInt ? Number(value.$numberInt) : Number(value) || 1,
      }))
      .filter(word => word.value > 0) // Only include words with positive frequency
      .sort((a, b) => b.value - a.value) // Sort by frequency
      .slice(0, 100); // Limit to top 100 words

    // Calculate min and max for scaling
    if (entries.length === 0) return [];
    
    const values = entries.map(e => e.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // Color palette
    const colors = [
      '#10B981', // green
      '#3B82F6', // blue  
      '#8B5CF6', // purple
      '#F59E0B', // amber
      '#EF4444', // red
      '#EC4899', // pink
      '#06B6D4', // cyan
    ];
    
    // Add scaled size and color to each word
    return entries.map((word, index) => {
      const scale = maxValue === minValue ? 1 : (word.value - minValue) / (maxValue - minValue);
      const fontSize = 16 + scale * 48; // 16px to 64px range
      
      // Use single color if colorScheme is 'single', otherwise use multiple colors
      const color = colorScheme === 'single' 
        ? '#3B82F6' // Use blue as default single color
        : colors[index % colors.length];
      
      return {
        ...word,
        fontSize,
        color,
      };
    });
  }, [keywordFrequency, colorScheme]);

  if (words.length === 0) {
    return (
      <div className="text-gray-400 text-center py-10">
        No keyword data available for word cloud
      </div>
    );
  }

  return (
    <div className="w-full min-h-[300px] bg-gray-800 rounded-lg p-4 relative overflow-hidden">
      {hoveredWord && (
        <div className="absolute top-2 right-2 bg-gray-900 text-white px-3 py-2 rounded text-sm shadow-lg z-20 border border-gray-700">
          <strong>{hoveredWord.text}</strong>: {hoveredWord.value}
        </div>
      )}

      <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 p-4">
        {words.map((word, index) => (
          <span
            key={`${word.text}-${index}`}
            style={{
              fontSize: `${word.fontSize}px`,
              color: word.color,
              fontWeight: word.fontSize > 40 ? 800 : 600,
              fontFamily: 'Inter, system-ui, sans-serif',
              lineHeight: 1.3,
              userSelect: 'none',
            }}
            className="inline-block cursor-pointer transition-all duration-200 hover:scale-110 hover:opacity-80 px-1"
            onMouseEnter={() => setHoveredWord(word)}
            onMouseLeave={() => setHoveredWord(null)}
            title={`${word.text}: ${word.value}`}
          >
            {word.text}
          </span>
        ))}
      </div>

      <div className="text-xs text-gray-500 text-center mt-2">
        Hover over words to see frequency · Size indicates relative frequency
      </div>
    </div>
  );
}

