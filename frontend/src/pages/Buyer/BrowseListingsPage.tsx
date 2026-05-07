import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search,
  Heart,
  MessageSquare,
  Star,
  MapPin,
  Filter
} from 'lucide-react';
import { User } from '@/context/AuthContext';
import BuyerMarketplacePanel from '@/components/Buyer/BuyerMarketplacePanel';

interface BrowseListingsPageProps {
  user: User;
}

const BrowseListingsPage: React.FC<BrowseListingsPageProps> = ({ user }) => {
  return <BuyerMarketplacePanel />;

  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);

  const listings = [
    {
      id: 1,
      name: 'Organic Tomatoes',
      farmer: 'Rajesh Kumar',
      location: 'Maharashtra',
      price: '₹30/kg',
      rating: 4.8,
      reviews: 24,
      image: '🍅',
      quantity: '50 kg available'
    },
    {
      id: 2,
      name: 'Fresh Carrots',
      farmer: 'Priya Agricultural Farm',
      location: 'Punjab',
      price: '₹20/kg',
      rating: 4.9,
      reviews: 18,
      image: '🥕',
      quantity: '30 kg available'
    },
    {
      id: 3,
      name: 'Spinach Bundle',
      farmer: 'Green Farm Solutions',
      location: 'Haryana',
      price: '₹15/kg',
      rating: 4.7,
      reviews: 12,
      image: '🥬',
      quantity: '25 kg available'
    },
    {
      id: 4,
      name: 'Bell Peppers',
      farmer: 'Amit Patel',
      location: 'Gujarat',
      price: '₹40/kg',
      rating: 4.6,
      reviews: 15,
      image: '🫑',
      quantity: '20 kg available'
    },
  ];

  const toggleFavorite = (id: number) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(fav => fav !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Fresh Produce</h1>
        <p className="text-gray-600 mt-2">Discover fresh crops from local farmers near you</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search for crops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {listings.map((listing) => (
          <Card key={listing.id} className="hover:shadow-lg transition-all">
            {/* Image */}
            <div className="h-32 bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center text-5xl rounded-t-lg">
              {listing.image}
            </div>

            <CardContent className="pt-4">
              {/* Title and Farmer */}
              <h3 className="font-semibold text-gray-900">{listing.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{listing.farmer}</p>

              {/* Location */}
              <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                <MapPin className="h-3 w-3" />
                {listing.location}
              </div>

              {/* Quantity */}
              <p className="text-xs text-green-600 font-medium mt-1">{listing.quantity}</p>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < Math.floor(listing.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-600">
                  {listing.rating} ({listing.reviews})
                </span>
              </div>

              {/* Price */}
              <p className="text-lg font-bold text-green-600 mt-3">{listing.price}</p>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => toggleFavorite(listing.id)}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      favorites.includes(listing.id)
                        ? 'fill-red-500 text-red-500'
                        : ''
                    }`}
                  />
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-1"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Button>
              </div>

              {/* Purchase Button */}
              <Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700">
                Buy Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-8">
        <Button variant="outline">← Previous</Button>
        <Button className="bg-green-600 hover:bg-green-700">1</Button>
        <Button variant="outline">2</Button>
        <Button variant="outline">3</Button>
        <Button variant="outline">Next →</Button>
      </div>
    </div>
  );
};

export default BrowseListingsPage;
