import React from 'react';

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  textClassName?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  imageClassName = 'h-10 w-10 sm:h-12 sm:w-12',
  showText = true,
  textClassName = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/favicon-v2.png"
        alt="FarmDirect logo"
        className={`block shrink-0 object-contain ${imageClassName}`}
      />
      {showText && (
        <span className={`font-semibold tracking-tight text-slate-950 ${textClassName}`}>
          FarmDirect
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
