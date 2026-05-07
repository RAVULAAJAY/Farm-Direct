import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Filter, X } from 'lucide-react';
import ProductCard from './ProductCard';
import { Product } from './AddProductForm';

interface ProductListProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onView?: (product: Product) => void;
  onUpdateStock?: (productId: string, stock: number) => void;
  onAddNew?: () => void;
  isFarmerView?: boolean;
  allowActions?: boolean;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  onEdit,
  onDelete,
  onView,
  onUpdateStock,
  onAddNew,
  isFarmerView = true,
  allowActions = true
}) => {
  const getStock = (product: Product) => product.stock ?? product.quantity;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('latest');

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'fruits', label: 'Fruits' },
    { value: 'grains', label: 'Grains' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'milk', label: 'Milk' },
    { value: 'meat', label: 'Meat & Poultry' },
    { value: 'honey', label: 'Honey & Spices' },
    { value: 'organic', label: 'Organic Products' }
  ];

  const sortOptions = [
    { value: 'latest', label: 'Latest Added' },
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'price-low', label: 'Price (Low to High)' },
    { value: 'price-high', label: 'Price (High to Low)' },
    { value: 'quantity', label: 'Quantity (Most Available)' }
  ];

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;

      return matchesSearch && matchesCategory;
    });

    // Apply sorting
    switch (sortBy) {
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'quantity':
        filtered.sort((a, b) => getStock(b) - getStock(a));
        break;
      case 'latest':
      default:
        filtered.sort((a, b) => {
          const getTimestamp = (product: Product) => {
            const dateValue = (product as Product & { createdAt?: string | Date }).createdAt ?? product.harvestDate;
            return new Date(dateValue).getTime();
          };

          return getTimestamp(b) - getTimestamp(a);
        });
    }

    return filtered;
  }, [products, searchTerm, filterCategory, sortBy]);

  const hasActiveFilters = searchTerm || filterCategory !== 'all' || sortBy !== 'latest';

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setSortBy('latest');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>
              {isFarmerView ? 'My Products' : 'Browse Products'}
            </CardTitle>
            <CardDescription>
              {filteredAndSortedProducts.length} product{filteredAndSortedProducts.length !== 1 ? 's' : ''} available
            </CardDescription>
          </div>
          {isFarmerView && onAddNew && (
            <Button onClick={onAddNew} className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filters Section */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by product name, description, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-48">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Products Grid */}
        {filteredAndSortedProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={onEdit}
                onDelete={onDelete}
                onView={onView}
                onUpdateStock={onUpdateStock}
                isFarmerView={isFarmerView}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-5xl mb-4">🚜</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters or search terms'
                : isFarmerView
                ? 'Start adding products to get started'
                : 'No products available yet'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
            {isFarmerView && !hasActiveFilters && onAddNew && (
              <Button onClick={onAddNew} className="gap-2 mt-4 bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4" />
                Add Your First Product
              </Button>
            )}
          </div>
        )}

        {/* Total Info */}
        {filteredAndSortedProducts.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t">
            <span>Showing {filteredAndSortedProducts.length} of {products.length} products</span>
            {products.length > 0 && (
              <span>
                Total Value: ₹
                {(
                  filteredAndSortedProducts.reduce(
                    (sum, p) => sum + p.price * getStock(p),
                    0
                  )
                ).toFixed(2)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductList;
