import Image from 'next/image';

const PlatformBadge = ({ platform, size = 'sm' }) => {
  const platformConfig = {
    youtube: {
      icon: '/youtube-logo.svg',
      name: 'YouTube',
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-gray-600/50',
      textColor: 'text-gray-200',
      iconFilter: 'grayscale(0.2) brightness(0.9)'
    },
    twitter: {
      icon: '/x-logo.svg',
      name: 'X',
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-gray-600/50',
      textColor: 'text-gray-200',
      iconFilter: 'grayscale(0) brightness(1.1)'
    },
    reddit: {
      icon: '/reddit-logo.svg',
      name: 'Reddit',
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-gray-600/50',
      textColor: 'text-gray-200',
      iconFilter: 'grayscale(0.2) brightness(0.9)'
    }
  };

  const config = platformConfig[platform?.toLowerCase()] || platformConfig.twitter;
  
  const sizeClasses = {
    xs: {
      container: 'px-2 py-0.5 gap-1',
      icon: 16,
      text: 'text-[10px]'
    },
    sm: {
      container: 'px-2.5 py-1 gap-1.5',
      icon: 18,
      text: 'text-xs'
    },
    md: {
      container: 'px-3 py-1.5 gap-2',
      icon: 20,
      text: 'text-sm'
    }
  };

  const sizeConfig = sizeClasses[size] || sizeClasses.sm;

  return (
    <div 
      className={`inline-flex items-center ${sizeConfig.container} rounded-lg border ${config.bgColor} ${config.borderColor} ${config.textColor} font-semibold backdrop-blur-sm hover:bg-gray-700/50 transition-all duration-200`}
    >
      <Image 
        src={config.icon} 
        alt={config.name} 
        width={sizeConfig.icon} 
        height={sizeConfig.icon} 
        className="object-contain" 
        style={{ filter: config.iconFilter }}
      />
      <span className={sizeConfig.text}>{config.name}</span>
    </div>
  );
};

export default PlatformBadge;

