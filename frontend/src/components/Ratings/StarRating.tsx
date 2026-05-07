import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  onRatingChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  onRatingChange,
  size = 'md',
  interactive = false,
  className = ''
}) => {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);
  const displayRating = hoverRating !== null ? hoverRating : rating;

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const handleStarClick = (value: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(value);
      setHoverRating(null);
    }
  };

  const handleStarHover = (value: number) => {
    if (interactive) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    setHoverRating(null);
  };

  return (
    <div
      className={`flex gap-1 ${interactive ? 'cursor-pointer' : ''} ${className}`}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: maxRating }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= Math.floor(displayRating);
        const isPartial = starValue === Math.ceil(displayRating) && displayRating % 1 !== 0;

        return (
          <button
            key={index}
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => handleStarHover(starValue)}
            disabled={!interactive}
            className={`${sizeClasses[size]} transition-all ${
              interactive ? 'hover:scale-110 focus:outline-none' : ''
            }`}
          >
            {isFilled ? (
              <Star
                className={`h-full w-full fill-yellow-400 text-yellow-400`}
              />
            ) : isPartial ? (
              <div className="relative h-full w-full">
                <Star className="h-full w-full text-gray-300" />
                <div className="absolute left-0 top-0 overflow-hidden h-full w-1/2">
                  <Star className="h-full w-full fill-yellow-400 text-yellow-400" fill="currentColor" />
                </div>
              </div>
            ) : (
              <Star className="h-full w-full text-gray-300" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
