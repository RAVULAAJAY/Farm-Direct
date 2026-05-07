import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Verified, Check } from 'lucide-react';
import StarRating from './StarRating';
import { Card } from '@/components/ui/card';

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  content: string;
  timestamp: string;
  verified: boolean;
  helpful: number;
  notHelpful: number;
  images?: string[];
  purchaseVerified?: boolean;
}

interface ReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: string) => void;
  onNotHelpful?: (reviewId: string) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onHelpful,
  onNotHelpful
}) => {
  const [userHelpfulVote, setUserHelpfulVote] = useState<'helpful' | 'not-helpful' | null>(null);

  const handleHelpful = () => {
    if (userHelpfulVote === 'helpful') {
      setUserHelpfulVote(null);
    } else {
      setUserHelpfulVote('helpful');
      onHelpful?.(review.id);
    }
  };

  const handleNotHelpful = () => {
    if (userHelpfulVote === 'not-helpful') {
      setUserHelpfulVote(null);
    } else {
      setUserHelpfulVote('not-helpful');
      onNotHelpful?.(review.id);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <Card className="p-4 mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Avatar */}
          <div className="h-10 w-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {review.userName.charAt(0).toUpperCase()}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">{review.userName}</span>
              {review.verified && (
                <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                  <Verified className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">Verified</span>
                </div>
              )}
              {review.purchaseVerified && (
                <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
                  <Check className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">Verified Purchase</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{formatDate(review.timestamp)}</p>
          </div>
        </div>

        {/* Rating Stars */}
        <div className="ml-2 flex-shrink-0">
          <StarRating rating={review.rating} size="sm" />
        </div>
      </div>

      {/* Review Title */}
      <div className="mb-2">
        <h4 className="font-semibold text-gray-900 text-sm">{review.title}</h4>
      </div>

      {/* Review Content */}
      <div className="mb-3">
        <p className="text-gray-700 text-sm leading-relaxed">{review.content}</p>
      </div>

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="mb-3 flex gap-2 flex-wrap">
          {review.images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Review image ${index + 1}`}
              className="h-16 w-16 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
            />
          ))}
        </div>
      )}

      {/* Footer - Helpful Buttons */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-600">Was this helpful?</p>
        
        <button
          onClick={handleHelpful}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
            userHelpfulVote === 'helpful'
              ? 'bg-green-100 text-green-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
          <span className="text-xs font-medium">{review.helpful}</span>
        </button>

        <button
          onClick={handleNotHelpful}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
            userHelpfulVote === 'not-helpful'
              ? 'bg-red-100 text-red-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ThumbsDown className="h-4 w-4" />
          <span className="text-xs font-medium">{review.notHelpful}</span>
        </button>
      </div>
    </Card>
  );
};

export default ReviewCard;
