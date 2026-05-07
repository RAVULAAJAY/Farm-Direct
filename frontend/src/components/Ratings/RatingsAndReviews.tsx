import React, { useState, useCallback } from 'react';
import ReviewInput from './ReviewInput';
import ReviewsList from './ReviewsList';
import { Review } from './ReviewCard';
import { useToast } from '@/hooks/use-toast';

interface RatingsAndReviewsProps {
  productId: string;
  initialReviews?: Review[];
  onReviewSubmitted?: (review: Omit<Review, 'id' | 'images'> & { images: string[] }) => void;
  readOnly?: boolean;
}

const RatingsAndReviews: React.FC<RatingsAndReviewsProps> = ({
  productId,
  initialReviews = [],
  onReviewSubmitted,
  readOnly = false
}) => {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleReviewSubmit = useCallback(async (reviewData: {
    rating: number;
    title: string;
    content: string;
    images: string[];
  }) => {
    setIsSubmitting(true);
    try {
      const newReview: Review = {
        id: `review-${Date.now()}`,
        userId: 'user-123',
        userName: 'You',
        userAvatar: '🧑',
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content,
        timestamp: new Date().toISOString(),
        verified: true,
        helpful: 0,
        notHelpful: 0,
        images: reviewData.images,
        purchaseVerified: true
      };

      setReviews(prev => [newReview, ...prev]);
      
      toast({
        title: 'Review Submitted',
        description: 'Thank you for sharing your experience!',
      });

      onReviewSubmitted?.({ ...newReview, images: newReview.images || [] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onReviewSubmitted, toast]);

  const handleHelpful = useCallback((reviewId: string) => {
    setReviews(prev =>
      prev.map(r =>
        r.id === reviewId
          ? { ...r, helpful: r.helpful + 1 }
          : r
      )
    );
  }, []);

  const handleNotHelpful = useCallback((reviewId: string) => {
    setReviews(prev =>
      prev.map(r =>
        r.id === reviewId
          ? { ...r, notHelpful: r.notHelpful + 1 }
          : r
      )
    );
  }, []);

  return (
    <div className="w-full space-y-6">
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ratings & Reviews</h2>

        {/* Review Input Section */}
        {!readOnly && (
          <ReviewInput
            onSubmit={handleReviewSubmit}
            isLoading={isSubmitting}
          />
        )}

        {/* Reviews List Section */}
        <ReviewsList
          reviews={reviews}
          onHelpful={handleHelpful}
          onNotHelpful={handleNotHelpful}
        />
      </div>
    </div>
  );
};

export default RatingsAndReviews;
