import React, { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import ReviewCard, { Review } from './ReviewCard';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ReviewsListProps {
  reviews: Review[];
  onHelpful?: (reviewId: string) => void;
  onNotHelpful?: (reviewId: string) => void;
}

type SortOption = 'recent' | 'helpful' | 'highest' | 'lowest';
type FilterRating = 'all' | '5' | '4' | '3' | '2' | '1';

const ReviewsList: React.FC<ReviewsListProps> = ({
  reviews,
  onHelpful,
  onNotHelpful
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterRating, setFilterRating] = useState<FilterRating>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(5);

  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviews];

    // Filter by rating
    if (filterRating !== 'all') {
      const ratingNum = parseInt(filterRating);
      result = result.filter(r => r.rating === ratingNum);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.content.toLowerCase().includes(query) ||
        r.userName.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case 'helpful':
        result.sort((a, b) => b.helpful - a.helpful);
        break;
      case 'highest':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        result.sort((a, b) => a.rating - b.rating);
        break;
      case 'recent':
      default:
        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
    }

    return result;
  }, [reviews, filterRating, searchQuery, sortBy]);

  const displayedReviews = filteredAndSortedReviews.slice(0, displayCount);
  const hasMore = displayedReviews.length < filteredAndSortedReviews.length;

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      dist[r.rating as keyof typeof dist]++;
    });
    return dist;
  }, [reviews]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-3xl font-bold text-gray-900">{averageRating}</p>
            <p className="text-sm text-gray-600">out of 5 stars</p>
          </div>
          <div className="flex-1 ml-6">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </p>
            {/* Rating distribution bars */}
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = ratingDistribution[rating as keyof typeof ratingDistribution];
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-8">{rating}★</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-yellow-400 h-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sort and Filter Controls */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Sort By</label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="helpful">Most Helpful</SelectItem>
                <SelectItem value="highest">Highest Rated</SelectItem>
                <SelectItem value="lowest">Lowest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Rating</label>
            <Select value={filterRating} onValueChange={(value) => setFilterRating(value as FilterRating)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSortBy('recent');
                setFilterRating('all');
                setSearchQuery('');
              }}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div>
        {filteredAndSortedReviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No reviews found matching your criteria.</p>
          </div>
        ) : (
          <>
            {displayedReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onHelpful={onHelpful}
                onNotHelpful={onNotHelpful}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount(prev => prev + 5)}
                  className="w-full sm:w-auto"
                >
                  Load More Reviews
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* No Reviews Message */}
      {reviews.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 font-medium">No reviews yet</p>
          <p className="text-sm text-gray-400 mt-1">Be the first to review this product!</p>
        </div>
      )}
    </div>
  );
};

export default ReviewsList;
