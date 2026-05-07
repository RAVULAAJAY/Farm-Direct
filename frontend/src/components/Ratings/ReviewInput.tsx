import React, { useState } from 'react';
import { X, Image as ImageIcon, Send } from 'lucide-react';
import StarRating from './StarRating';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ReviewInputProps {
  onSubmit: (review: {
    rating: number;
    title: string;
    content: string;
    images: string[];
  }) => void;
  isLoading?: boolean;
}

const ReviewInput: React.FC<ReviewInputProps> = ({
  onSubmit,
  isLoading = false
}) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const maxCharacters = 500;
  const maxImages = 5;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }
    if (!title.trim()) {
      newErrors.title = 'Please enter a review title';
    }
    if (!content.trim()) {
      newErrors.content = 'Please enter a review';
    }
    if (content.length > maxCharacters) {
      newErrors.content = `Review cannot exceed ${maxCharacters} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).slice(0, maxImages - imagePreview.length);
    
    newImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreview(prev => [...prev, result]);
        setImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImagePreview(prev => prev.filter((_, i) => i !== index));
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      rating,
      title: title.trim(),
      content: content.trim(),
      images
    });

    // Reset form
    setRating(0);
    setTitle('');
    setContent('');
    setImages([]);
    setImagePreview([]);
    setErrors({});
  };

  return (
    <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">Share Your Experience</h3>

        {/* Rating Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <StarRating
              rating={rating}
              maxRating={5}
              onRatingChange={setRating}
              interactive={true}
              size="lg"
            />
            {rating > 0 && (
              <span className="text-sm font-medium text-gray-700">
                {rating}/5 Stars
              </span>
            )}
          </div>
          {errors.rating && (
            <p className="text-xs text-red-600 mt-1">{errors.rating}</p>
          )}
        </div>

        {/* Title Input */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Review Title <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            type="text"
            placeholder="Summarize your experience in a title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) {
                setErrors(prev => ({ ...prev, title: '' }));
              }
            }}
            className={errors.title ? 'border-red-500' : ''}
            disabled={isLoading}
            maxLength={100}
          />
          {errors.title && (
            <p className="text-xs text-red-600 mt-1">{errors.title}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{title.length}/100</p>
        </div>

        {/* Content Textarea */}
        <div className="mb-4">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Review <span className="text-red-500">*</span>
          </label>
          <Textarea
            id="content"
            placeholder="Tell us what you think about this product..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (errors.content) {
                setErrors(prev => ({ ...prev, content: '' }));
              }
            }}
            className={`min-h-24 ${errors.content ? 'border-red-500' : ''}`}
            disabled={isLoading}
            maxLength={maxCharacters}
          />
          {errors.content && (
            <p className="text-xs text-red-600 mt-1">{errors.content}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {content.length}/{maxCharacters} characters
          </p>
        </div>

        {/* Image Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Photos ({imagePreview.length}/{maxImages})
          </label>
          
          <div className="flex gap-2 mb-3 flex-wrap">
            {imagePreview.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="h-16 w-16 object-cover rounded border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {imagePreview.length < maxImages && (
              <label className="h-16 w-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                <ImageIcon className="h-5 w-5 text-gray-400" />
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isLoading}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Upload up to {maxImages} images to showcase your experience
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-2 justify-end">
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={isLoading || rating === 0 || !title || !content}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="h-4 w-4 mr-2" />
          {isLoading ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    </Card>
  );
};

export default ReviewInput;
