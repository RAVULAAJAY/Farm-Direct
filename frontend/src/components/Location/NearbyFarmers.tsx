import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Star,
  MessageCircle,
  Phone,
  Verified,
  TrendingUp,
  Users
} from 'lucide-react';

export interface Farmer {
  id: string;
  name: string;
  avatar: string;
  location: string;
  distance: number;
  rating: number;
  totalReviews: number;
  products: number;
  responseTime: string;
  isVerified: boolean;
  isFeatured?: boolean;
  speciality: string;
  priceRange?: string;
  description: string;
}

interface NearbyFarmersProps {
  farmers: Farmer[];
  selectedLocation?: string;
  maxDistance?: number;
  onFarmerClick?: (farmer: Farmer) => void;
  onMessage?: (farmerId: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

const NearbyFarmers: React.FC<NearbyFarmersProps> = ({
  farmers,
  selectedLocation = '',
  maxDistance = 50,
  onFarmerClick,
  onMessage,
  isLoading = false,
  emptyMessage = 'No farmers found in this area'
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-3 pb-4 border-b last:border-b-0">
                <div className="flex gap-4">
                  <div className="h-16 w-16 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (farmers.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="pt-12 pb-12 text-center">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">{emptyMessage}</p>
          <p className="text-sm text-gray-500">
            Try adjusting your location or distance filter
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by distance
  const sortedFarmers = [...farmers].sort((a, b) => a.distance - b.distance);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Nearby Farmers
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{selectedLocation || 'Your location'}</span>
          </div>
          <div>•</div>
          <div>
            <span className="font-medium">{farmers.length}</span> farms within{' '}
            <span className="font-medium">{maxDistance} km</span>
          </div>
        </div>
      </div>

      {/* Farmers List */}
      {sortedFarmers.map((farmer) => (
        <Card
          key={farmer.id}
          className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-200"
          onClick={() => onFarmerClick?.(farmer)}
        >
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={farmer.avatar} alt={farmer.name} />
                    <AvatarFallback>{farmer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {farmer.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-1">
                      <Verified className="h-4 w-4 text-white fill-white" />
                    </div>
                  )}
                  {farmer.isFeatured && (
                    <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full px-2 py-0.5">
                      <span className="text-xs font-bold">⭐</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Name and Badge */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {farmer.name}
                  </h3>
                  {farmer.isFeatured && (
                    <Badge className="flex-shrink-0 bg-yellow-100 text-yellow-800 border-yellow-300">
                      Featured
                    </Badge>
                  )}
                </div>

                {/* Location and Distance */}
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                  <MapPin className="h-3 w-3" />
                  <span>{farmer.location}</span>
                  <span className="ml-auto font-medium text-green-600">
                    {farmer.distance} km away
                  </span>
                </div>

                {/* Specialty and Price */}
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">{farmer.speciality}</span>
                  {farmer.priceRange && (
                    <span className="text-gray-600 ml-2">• {farmer.priceRange}</span>
                  )}
                </p>

                {/* Rating and Stats */}
                <div className="flex items-center gap-3 mb-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-gray-900">
                      {farmer.rating}
                    </span>
                    <span>({farmer.totalReviews} reviews)</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                    <span>{farmer.products} products</span>
                  </div>
                  <span>•</span>
                  <span>⏱️ {farmer.responseTime}</span>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                  {farmer.description}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMessage?.(farmer.id);
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFarmerClick?.(farmer);
                    }}
                  >
                    <Phone className="h-4 w-4" />
                    View Profile
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NearbyFarmers;
