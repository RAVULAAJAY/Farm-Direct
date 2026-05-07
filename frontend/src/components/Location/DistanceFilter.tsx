import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, RotateCcw } from 'lucide-react';

interface DistanceFilterProps {
  maxDistance?: number;
  onDistanceChange: (distance: number) => void;
  onReset?: () => void;
  disabled?: boolean;
}

const DistanceFilter: React.FC<DistanceFilterProps> = ({
  maxDistance = 50,
  onDistanceChange,
  onReset,
  disabled = false
}) => {
  const [distance, setDistance] = useState(maxDistance);

  const handleDistanceChange = (value: number[]) => {
    const newDistance = value[0];
    setDistance(newDistance);
    onDistanceChange(newDistance);
  };

  const getDistanceCategory = (dist: number): string => {
    if (dist <= 5) return 'Very Close';
    if (dist <= 15) return 'Close';
    if (dist <= 30) return 'Moderate';
    return 'Far';
  };

  const getDistanceColor = (dist: number) => {
    if (dist <= 5) return 'bg-green-100 text-green-800 border-green-300';
    if (dist <= 15) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (dist <= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-orange-100 text-orange-800 border-orange-300';
  };

  const predefinedRanges = [
    { label: '5 km', value: 5, emoji: '✓' },
    { label: '15 km', value: 15, emoji: '●' },
    { label: '30 km', value: 30, emoji: '●' },
    { label: '50+ km', value: 50, emoji: '●' }
  ];

  return (
    <Card className="bg-white">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Distance Filter</h3>
          </div>
          {onReset && (
            <Button
              onClick={onReset}
              variant="ghost"
              size="sm"
              className="gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>

        {/* Current Distance Display */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-sm font-medium text-gray-600">
              Search Radius
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600">
                {distance}
              </span>
              <span className="text-sm text-gray-600">km</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              className={`${getDistanceColor(distance)} border`}
            >
              {getDistanceCategory(distance)}
            </Badge>
            <span className="text-xs text-gray-600">
              {distance <= 5 && 'Farms very near you'}
              {distance > 5 && distance <= 15 && 'Close by farms'}
              {distance > 15 && distance <= 30 && 'Nearby farms'}
              {distance > 30 && 'Extended search area'}
            </span>
          </div>
        </div>

        <Separator />

        {/* Slider */}
        <div className="space-y-4">
          <div className="px-2">
            <Slider
              value={[distance]}
              onValueChange={handleDistanceChange}
              min={1}
              max={100}
              step={1}
              disabled={disabled}
              className="w-full"
            />
          </div>

          {/* Distance Labels */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>1 km</span>
            <span>50 km</span>
            <span>100 km</span>
          </div>
        </div>

        <Separator />

        {/* Quick Select Buttons */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase">
            Quick Select
          </p>
          <div className="grid grid-cols-2 gap-2">
            {predefinedRanges.map((range) => (
              <Button
                key={range.value}
                onClick={() => handleDistanceChange([range.value])}
                variant={distance === range.value ? 'default' : 'outline'}
                size="sm"
                className={
                  distance === range.value
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : ''
                }
              >
                <span className="mr-2">{range.emoji}</span>
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-blue-900">
          <p className="font-medium mb-1">Distance calculated from:</p>
          <p>
            Your current location • Shows estimated travel distance to farms
          </p>
        </div>

        {/* Expected Results */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-700">
          <p className="font-medium mb-1">📍 Within {distance} km:</p>
          <p>
            {distance <= 5 && 'Showing farms in very close proximity (15-25 farms typically)'}
            {distance > 5 && distance <= 15 && 'Showing nearby farms in your area (30-50 farms typically)'}
            {distance > 15 && distance <= 30 && 'Showing farms in your locality (50-100 farms typically)'}
            {distance > 30 && 'Showing farms across your region (100+ farms typically)'}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default DistanceFilter;
