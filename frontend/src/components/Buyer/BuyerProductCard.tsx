import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ShoppingCart,
  Heart,
  MapPin,
  Star,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Product } from '@/lib/data';

interface BuyerProductCardProps {
  product: Product;
  farmer?: {
    name: string;
    rating: number;
    reviews: number;
    avatar?: string;
  };
  onAddToCart?: (productId: string, quantity: number) => void;
  onViewDetails?: (product: Product) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
}

const BuyerProductCard: React.FC<BuyerProductCardProps> = ({
  product,
  farmer,
  onAddToCart,
  onViewDetails,
  isFavorite = false,
  onToggleFavorite
}) => {
  const [quantity, setQuantity] = useState(1);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const availableStock = product.stock ?? product.quantity;

  const categoryLabels: Record<string, string> = {
    vegetables: 'Vegetables',
    fruits: 'Fruits',
    grains: 'Grains',
    dairy: 'Dairy',
    meat: 'Meat & Poultry',
    honey: 'Honey & Spices',
    organic: 'Organic',
    other: 'Other'
  };

  const categoryColors: Record<string, string> = {
    vegetables: 'bg-green-100 text-green-700',
    fruits: 'bg-red-100 text-red-700',
    grains: 'bg-yellow-100 text-yellow-700',
    dairy: 'bg-blue-100 text-blue-700',
    meat: 'bg-purple-100 text-purple-700',
    honey: 'bg-orange-100 text-orange-700',
    organic: 'bg-emerald-100 text-emerald-700',
    other: 'bg-gray-100 text-gray-700'
  };

  const isLowStock = availableStock > 0 && availableStock <= 5;
  const isOutOfStock = availableStock === 0;

  const handleAddToCart = () => {
    onAddToCart?.(product.id, quantity);

    setShowQuickAdd(false);
    setQuantity(1);
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
        {/* Image Container */}
        <div className="relative h-48 bg-gray-100 overflow-hidden group">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <img 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E"
                alt="No image"
              />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2">
            <Badge className={categoryColors[product.category as keyof typeof categoryColors] || categoryColors.other}>
              {categoryLabels[product.category as keyof typeof categoryLabels] || 'Other'}
            </Badge>
          </div>

          {/* Favorite Button */}
          <button
            onClick={() => onToggleFavorite?.(product.id)}
            className="absolute top-2 right-2 bg-white rounded-full p-2 shadow hover:shadow-lg transition-shadow"
          >
            <Heart
              className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            />
          </button>

          {/* Stock Status Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <p className="text-white font-semibold text-lg">Out of Stock</p>
            </div>
          )}

          {isLowStock && !isOutOfStock && (
            <div className="absolute bottom-0 left-0 right-0 bg-orange-500 text-white py-1 px-2 text-xs font-semibold">
              Only {availableStock} left!
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-4 flex-1 flex flex-col">
          {/* Product Name */}
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2">
            {product.name}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
            <MapPin className="h-3 w-3" />
            <span>{product.location}</span>
          </div>

          {/* Farmer Info (if provided) */}
          {farmer && (
            <div className="mb-3 pb-3 border-b border-gray-200 text-xs">
              <div className="mb-2 flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={farmer.avatar} alt={farmer.name} />
                  <AvatarFallback>{farmer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="text-gray-700 font-medium">{farmer.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < Math.floor(farmer.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600">
                  {farmer.rating} ({farmer.reviews})
                </span>
              </div>
            </div>
          )}

          {/* Price and Unit */}
          <div className="mb-3">
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-gray-900">
                ₹{product.price.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mb-1">/{product.unit}</p>
            </div>
          </div>

          {/* Description Preview */}
          {product.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-3">
              {product.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 mt-auto">
            <Button
              onClick={() => setShowQuickAdd(true)}
              disabled={isOutOfStock}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <ShoppingCart className="h-4 w-4" />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </Button>
            <Button
              onClick={() => onViewDetails?.(product)}
              variant="outline"
              className="w-full text-xs"
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Dialog */}
      <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Cart</DialogTitle>
            <DialogDescription>{product.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Product Info */}
            <div className="flex gap-4">
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div>
                <p className="font-semibold text-gray-900">{product.name}</p>
                {farmer && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-700">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={farmer.avatar} alt={farmer.name} />
                      <AvatarFallback>{farmer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{farmer.name}</span>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  ₹{product.price}/{product.unit}
                </p>
                <p className="text-xs text-gray-500 mt-1">{product.location}</p>
              </div>
            </div>

            {/* Quantity Selection */}
            <div>
              <Label className="text-sm font-medium">Quantity</Label>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  −
                </Button>
                <span className="text-lg font-semibold w-12 text-center">
                  {quantity} {product.unit}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  disabled={quantity >= availableStock}
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Stock: {availableStock} {product.unit}
              </p>
            </div>

            {/* Total Price */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Price:</span>
                <span className="text-2xl font-bold text-gray-900">
                  ₹{(product.price * quantity).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
              <Button
                onClick={() => setShowQuickAdd(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BuyerProductCard;
