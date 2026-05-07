import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, ShoppingBag, Star, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { products, favoriteProductIds, toggleFavoriteProduct } = useGlobalState();

  const favoriteProducts = useMemo(() => {
    const favoriteSet = new Set(favoriteProductIds);
    return products.filter((product) => favoriteSet.has(product.id));
  }, [favoriteProductIds, products]);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="border-0 bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 text-white shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                <Heart className="h-3 w-3 fill-white" />
                Saved Items
              </div>
              <h1 className="mt-3 text-3xl font-bold">Your wishlist</h1>
              <p className="mt-2 max-w-2xl text-rose-50">
                Review the products you saved while browsing and jump back into checkout when you are ready.
              </p>
            </div>
            <Button className="bg-white text-rose-700 hover:bg-rose-50" onClick={() => navigate('/browse')}>
              Browse More
            </Button>
          </div>
        </CardContent>
      </Card>

      {favoriteProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {favoriteProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden transition-shadow hover:shadow-lg">
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 text-5xl">
                {product.image}
              </div>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
                    <p className="text-sm text-gray-600">{product.farmerName}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 bg-rose-50 text-rose-700">
                    Saved
                  </Badge>
                </div>

                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {product.location}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{product.rating?.toFixed(1) ?? '0.0'}</span>
                  </div>
                  <span>•</span>
                  <span>{product.reviews ?? 0} reviews</span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="text-gray-600">Price</span>
                  <span className="font-semibold text-emerald-700">₹{product.price}/{product.unit}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => navigate(`/product/${product.id}`)}>
                    View Details
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => toggleFavoriteProduct(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-400" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">No saved items yet</h2>
            <p className="mt-2 max-w-md text-sm text-gray-600">
              Tap the heart on any listing to save it here for later comparison or checkout.
            </p>
            <Button className="mt-5" onClick={() => navigate('/browse')}>
              Explore Listings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FavoritesPage;