import clsx from 'clsx';

// Shared platform badge used across Inbox, Analytics, etc.
// Matches the visual style of the Inbox badges with logos.
const PLATFORM_META = {
  twitter: {
    label: 'Public Tweets',
    logo: '/x-logo.svg',
    className: 'bg-white/10 border-white/50',
  },
  youtube: {
    label: 'YouTube',
    logo: '/youtube-logo.svg',
    className: 'bg-red-500/15 text-red-200 border-red-500/40',
  },
  reddit: {
    label: 'Reddit',
    logo: '/reddit-4.svg',
    className: 'bg-orange-500/10 text-orange-200 border-orange-400/60',
  },
  google: {
    label: 'Google',
    logo: '/google-logo.svg',
    className: 'bg-indigo-500/20 text-indigo-100 border-indigo-400/60',
  },
  instagram: {
    label: 'Instagram',
    logo: '/instagram-logo.svg',
    className: 'bg-pink-500/20 text-pink-100 border-pink-400/60',
  },
};

const PlatformBadge = ({ platform, size = 'md' }) => {
  const platformMeta = PLATFORM_META[platform?.toLowerCase()] || PLATFORM_META.google;
  
  const sizeClasses = {
    xs: 'px-2 py-2',
    sm: 'px-2.5 py-2.5',
    md: 'px-2 py-2',
  };
  
  const logoSizeClasses = {
    xs: 'h-5 w-6',
    sm: 'h-6 w-7',
    md: 'h-5 w-6',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border text-xs',
        platformMeta.className,
        sizeClasses[size] || sizeClasses.md,
      )}
    >
      <img src={platformMeta.logo} alt={platformMeta.label} className={clsx('object-contain', logoSizeClasses[size] || logoSizeClasses.md)} />
    </span>
  );
};

export default PlatformBadge;

