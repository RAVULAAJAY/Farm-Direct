import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Eye, ShoppingCart, MapPin } from 'lucide-react';
import { Product } from './AddProductForm';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onView?: (product: Product) => void;
  onUpdateStock?: (productId: string, stock: number) => void;
  isFarmerView?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onView,
  onUpdateStock,
  isFarmerView = true
}) => {
  const categoryLabels: Record<string, string> = {
    vegetables: 'Vegetables',
    fruits: 'Fruits',
    grains: 'Grains',
    dairy: 'Dairy',
    milk: 'Milk',
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
    milk: 'bg-cyan-100 text-cyan-700',
    meat: 'bg-purple-100 text-purple-700',
    honey: 'bg-orange-100 text-orange-700',
    organic: 'bg-emerald-100 text-emerald-700',
    other: 'bg-gray-100 text-gray-700'
  };

  const availableStock = product.stock ?? product.quantity;
  const [stockInput, setStockInput] = useState(String(availableStock));

  useEffect(() => {
    setStockInput(String(availableStock));
  }, [availableStock]);

  const stockStatus = availableStock > 10 ? 'In Stock' : availableStock > 0 ? 'Low Stock' : 'Out of Stock';
  const stockColor = availableStock > 10 ? 'bg-green-100 text-green-700' : availableStock > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

  const applyStockUpdate = () => {
    const parsed = Number.parseInt(stockInput, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      setStockInput(String(availableStock));
      return;
    }

    onUpdateStock?.(product.id, parsed);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        {/* Product Image */}
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <img 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E"
                alt="No image"
              />
            </div>
          )}
          <Badge className={`absolute top-2 right-2 ${categoryColors[product.category as keyof typeof categoryColors] || categoryColors.other}`}>
            {categoryLabels[product.category as keyof typeof categoryLabels] || 'Other'}
          </Badge>
        </div>

        <CardContent className="p-4">
          {/* Product Name and Location */}
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">{product.name}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
              <MapPin className="h-3 w-3" />
              <span>{product.location}</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{product.description}</p>
          )}

          {/* Price and Quantity */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-sm text-gray-600">Price</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{product.price.toFixed(2)}
                <span className="text-sm text-gray-600">/{product.unit}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Stock</p>
              <p className="text-lg font-semibold text-gray-900">{availableStock} {product.unit}</p>
            </div>
          </div>

          {/* Stock Status */}
          <div className="mb-4">
            <Badge className={`w-full justify-center py-1 ${stockColor}`}>
              {stockStatus}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {isFarmerView ? (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => onEdit?.(product)}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this product?')) {
                        onDelete?.(product.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => onView?.(product)}
                >
                  <Eye className="h-4 w-4" />
                  View Listing
                </Button>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={stockInput}
                    onChange={(event) => setStockInput(event.target.value)}
                    className="h-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={applyStockUpdate}
                  >
                    Update Stock
                  </Button>
                </div>
              </>
            ) : (
              // Buyer view
              <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default ProductCard;
