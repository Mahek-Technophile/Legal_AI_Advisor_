import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface DeepSearchButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export function DeepSearchButton({ onClick, isLoading, isDisabled }: DeepSearchButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      disabled={isDisabled || isLoading}
      className="flex items-center space-x-2 bg-sapphire-blue text-off-white px-4 py-2 rounded-lg hover:bg-sapphire-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Searching...</span>
        </>
      ) : (
        <>
          <Search className="h-5 w-5" />
          <span>DeepSearch</span>
        </>
      )}
      
      {isHovered && !isDisabled && !isLoading && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-midnight-navy text-off-white text-xs rounded-lg p-2 shadow-lg z-10 border border-sapphire-blue/20">
          <p>Search legal databases for relevant case law, statutes, and articles related to this document.</p>
        </div>
      )}
    </button>
  );
}