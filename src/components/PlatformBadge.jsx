import { Circle } from 'lucide-react';
import clsx from 'clsx';

// Shared platform badge used across Inbox, Analytics, etc.
// Matches the visual style of the Inbox badges.
const PlatformBadge = ({ platform }) => {
  const map = {
    twitter: { label: 'Public Tweets', color: 'bg-sky-500/15 text-sky-200 border-sky-500/40' },
    youtube: { label: 'YouTube', color: 'bg-red-500/15 text-red-200 border-red-500/40' },
    reddit: { label: 'Reddit', color: 'bg-orange-500/15 text-orange-200 border-orange-500/40' },
    news: { label: 'News', color: 'bg-amber-500/15 text-amber-200 border-amber-500/40' },
  };

  // Treat Google/web results like "news" so they match Inbox
  const raw = platform?.toLowerCase();
  const key = raw === 'google' ? 'news' : raw;
  const info = map[key] || map.news;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        info.color,
      )}
    >
      <Circle className="h-2 w-2" />
      {info.label}
    </span>
  );
};

export default PlatformBadge;

