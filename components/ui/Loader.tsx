
import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-12 h-12 border-4',
    lg: 'w-24 h-24 border-8',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 my-4">
      <div className={`${sizeClasses[size]} border-indigo-400 border-t-transparent rounded-full animate-spin`}></div>
      {text && <p className="text-gray-400 text-lg animate-pulse">{text}</p>}
    </div>
  );
};

export default Loader;
