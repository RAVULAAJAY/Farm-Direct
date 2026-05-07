import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { X, MapPin, DollarSign, Layers, Navigation } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export interface FilterState {
  searchTerm: string;
  category: string;
  priceRange: [number, number];
  location: string;
  distanceKm: string;
  sortBy: string;
}

interface FilterPanelProps {
  onFiltersChange: (filters: FilterState) => void;
  filters: FilterState;
  locations?: string[];
  maxPrice?: number;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  onFiltersChange,
  filters,
  locations = [
    'Delhi',
    'Noida',
    'Gurgaon',
    'Faridabad',
    'Greater Noida',
    'All NCR',
    'Mumbai',
    'Bangalore',
    'Chennai',
    'Kolkata'
  ],
  maxPrice = 500
}) => {
  const ALL_LOCATIONS_VALUE = 'all-locations';

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

  const hasActiveFilters = 
    filters.category !== 'all' || 
    filters.location !== '' || 
    filters.distanceKm !== 'all' ||
    filters.priceRange[0] > 0 || 
    filters.priceRange[1] < maxPrice;

  const handleCategoryChange = (value: string) => {
    onFiltersChange({ ...filters, category: value });
  };

  const handleLocationChange = (value: string) => {
    onFiltersChange({ ...filters, location: value });
  };

  const handlePriceChange = (value: [number, number]) => {
    onFiltersChange({ ...filters, priceRange: value });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({ ...filters, sortBy: value });
  };

  const handleDistanceChange = (value: string) => {
    onFiltersChange({ ...filters, distanceKm: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      searchTerm: filters.searchTerm,
      category: 'all',
      priceRange: [0, maxPrice],
      location: '',
      distanceKm: 'all',
      sortBy: 'popular'
    });
  };

  return (
    <Card className="sticky top-4 h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sort By */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Sort By</Label>
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t pt-4" />

        {/* Category Filter */}
        <div>
          <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Category
          </Label>
          <div className="space-y-2">
            {categories.map(cat => (
              <label key={cat.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="radio"
                  name="category"
                  value={cat.value}
                  checked={filters.category === cat.value}
                  onChange={() => handleCategoryChange(cat.value)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">{cat.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t pt-4" />

        {/* Price Filter */}
        <div>
          <Label className="text-sm font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Price Range
          </Label>
          <div className="space-y-4">
            <Slider
              min={0}
              max={maxPrice}
              step={10}
              value={filters.priceRange}
              onValueChange={handlePriceChange}
              className="w-full"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                ₹{filters.priceRange[0]}
              </span>
              <span className="text-gray-500">to</span>
              <span className="font-medium text-gray-700">
                ₹{filters.priceRange[1]}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4" />

        {/* Distance Filter */}
        <div>
          <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Distance
          </Label>
          <Select value={filters.distanceKm} onValueChange={handleDistanceChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Distance</SelectItem>
              <SelectItem value="5">Within 5 km</SelectItem>
              <SelectItem value="10">Within 10 km</SelectItem>
              <SelectItem value="25">Within 25 km</SelectItem>
              <SelectItem value="50">Within 50 km</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t pt-4" />

        {/* Location Filter */}
        <div>
          <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </Label>
          <Select
            value={filters.location || ALL_LOCATIONS_VALUE}
            onValueChange={(value) => handleLocationChange(value === ALL_LOCATIONS_VALUE ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_LOCATIONS_VALUE}>All Locations</SelectItem>
              {locations.map(loc => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <>
            <div className="border-t pt-4" />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">Active Filters:</p>
              <div className="flex flex-wrap gap-2">
                {filters.category !== 'all' && (
                  <Badge
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    onClick={() => handleCategoryChange('all')}
                  >
                    {categories.find(c => c.value === filters.category)?.label}
                    <X className="h-3 w-3 cursor-pointer" />
                  </Badge>
                )}
                {filters.location && (
                  <Badge
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    onClick={() => handleLocationChange('')}
                  >
                    {filters.location}
                    <X className="h-3 w-3 cursor-pointer" />
                  </Badge>
                )}
                {filters.distanceKm !== 'all' && (
                  <Badge
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    onClick={() => handleDistanceChange('all')}
                  >
                    Within {filters.distanceKm} km
                    <X className="h-3 w-3 cursor-pointer" />
                  </Badge>
                )}
                {(filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) && (
                  <Badge
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    onClick={() => handlePriceChange([0, maxPrice])}
                  >
                    ₹{filters.priceRange[0]}-{filters.priceRange[1]}
                    <X className="h-3 w-3 cursor-pointer" />
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FilterPanel;
