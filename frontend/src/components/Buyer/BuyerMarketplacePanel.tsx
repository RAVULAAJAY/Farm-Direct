import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Search, Zap, Heart, ShoppingCart, TrendingUp, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';
import { Product } from '@/lib/data';
import FilterPanel, { FilterState } from '@/components/Buyer/FilterPanel';
import BuyerProductCard from '@/components/Buyer/BuyerProductCard';

const getStock = (product: Product) => product.stock ?? product.quantity;

const parseCoordinates = (value: string): { lat: number; lon: number } | null => {
  const bracketMatch = value.match(/\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/);
  const rawMatch = value.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const match = bracketMatch ?? rawMatch;

  if (!match) {
    return null;
  }

  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }

  return { lat, lon };
};

const calculateDistanceKm = (
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
) => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const getFarmerCoordinates = (
  farmerId: string,
  users: Array<{ id: string; farmerOnboarding?: { farmLocation?: { latitude: number; longitude: number } } }>,
  products: Product[]
) => {
  const farmerUser = users.find((entry) => entry.id === farmerId);
  const fromOnboarding = farmerUser?.farmerOnboarding?.farmLocation;
  if (fromOnboarding) {
    return { lat: fromOnboarding.latitude, lon: fromOnboarding.longitude };
  }

  const firstFarmerProduct = products.find((item) => item.farmerId === farmerId);
  if (!firstFarmerProduct) {
    return null;
  }

  return parseCoordinates(firstFarmerProduct.location);
};

const BuyerMarketplacePanel: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    products,
    orders,
    users,
    favoriteProductIds,
    toggleFavoriteProduct,
    isFavoriteProduct,
    addToCart,
    cartItems,
  } = useGlobalState();

  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    category: 'all',
    priceRange: [0, 500],
    location: '',
    distanceKm: 'all',
    sortBy: 'popular',
  });
  const [successMessage, setSuccessMessage] = useState('');

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(search) ||
          product.farmerName.toLowerCase().includes(search) ||
          product.location.toLowerCase().includes(search)
      );
    }

    if (filters.category !== 'all') {
      result = result.filter((product) => product.category === filters.category);
    }

    result = result.filter(
      (product) => product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
    );

    if (filters.location) {
      result = result.filter((product) => product.location.includes(filters.location));
    }

    if (filters.distanceKm !== 'all' && currentUser?.location) {
      const buyerCoords = parseCoordinates(currentUser.location);
      const maxDistance = Number(filters.distanceKm);

      if (buyerCoords && !Number.isNaN(maxDistance)) {
        result = result.filter((product) => {
          const productCoords = parseCoordinates(product.location);
          if (!productCoords) {
            return false;
          }

          return calculateDistanceKm(buyerCoords, productCoords) <= maxDistance;
        });
      }
    }

    switch (filters.sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result.sort((a, b) => {
          const getTimestamp = (product: Product) => new Date(product.createdAt ?? product.harvestDate).getTime();
          return getTimestamp(b) - getTimestamp(a);
        });
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
      default:
        break;
    }

    return result;
  }, [filters, products, currentUser]);

  const buyerCoords = useMemo(() => {
    if (!currentUser?.location) {
      return null;
    }

    return parseCoordinates(currentUser.location);
  }, [currentUser?.location]);

  const nearbyFarmers = useMemo(() => {
    const farmersWithProducts = users.filter((entry) => entry.role === 'farmer').map((farmer) => {
      const farmerProducts = products.filter((item) => item.farmerId === farmer.id);
      const coordinates = getFarmerCoordinates(farmer.id, users, products);
      const distance = buyerCoords && coordinates ? calculateDistanceKm(buyerCoords, coordinates) : null;

      const totalReviews = farmerProducts.reduce((sum, item) => sum + (item.reviews ?? 0), 0);
      const weightedRating = farmerProducts.reduce(
        (sum, item) => sum + (item.rating ?? 0) * (item.reviews ?? 0),
        0
      );

      return {
        id: farmer.id,
        name: farmer.farmName || farmer.name,
        location: farmer.location,
        productsCount: farmerProducts.length,
        averageRating: totalReviews > 0 ? weightedRating / totalReviews : 0,
        totalReviews,
        distance,
        coordinates,
      };
    });

    return farmersWithProducts
      .filter((farmer) => farmer.productsCount > 0)
      .filter((farmer) => farmer.distance === null || farmer.distance <= 50)
      .sort((left, right) => {
        const leftDistance = left.distance ?? Number.POSITIVE_INFINITY;
        const rightDistance = right.distance ?? Number.POSITIVE_INFINITY;
        return leftDistance - rightDistance;
      })
      .slice(0, 6);
  }, [buyerCoords, products, users]);

  const mapCenter = nearbyFarmers.find((farmer) => farmer.coordinates)?.coordinates ?? buyerCoords;
  const mapSrc = mapCenter
    ? `https://maps.google.com/maps?q=${mapCenter.lat},${mapCenter.lon}&z=11&output=embed`
    : '';

  const buyerOrders = useMemo(
    () => orders.filter((order) => order.buyerId === currentUser?.id),
    [orders, currentUser?.id]
  );

  const stats = {
    totalProducts: products.length,
    favorites: favoriteProductIds.length,
    cartItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    availableProducts: products.filter((product) => getStock(product) > 0).length,
  };

  const handleAddToCart = (productId: string, quantity: number) => {
    addToCart(productId, quantity);
    const addedProduct = products.find((product) => product.id === productId);
    if (addedProduct) {
      setSuccessMessage(`Added ${quantity} ${addedProduct.unit} of ${addedProduct.name} to cart.`);
    }
    window.setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleToggleFavorite = (productId: string) => {
    toggleFavoriteProduct(productId);
  };

  const getFarmerDetails = (farmerId: string, farmerName: string) => {
    const farmerUser = users.find((entry) => entry.id === farmerId);
    const farmer = nearbyFarmers.find((entry) => entry.id === farmerId);

    return {
      name: farmer?.name ?? farmerName,
      rating: farmer?.averageRating ? Number(farmer.averageRating.toFixed(1)) : 4.5,
      reviews: farmer?.totalReviews ?? 0,
      avatar: farmerUser?.profilePhoto,
    };
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">FarmDirect Marketplace</h1>
        <p className="text-gray-600 mt-2">Browse all products from shared state, filter them, save favorites, and place orders.</p>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-600">Products</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-600">Saved</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.favorites}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-600">Cart Items</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.cartItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-600">Available</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.availableProducts}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">Featured</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {products
              .filter((product) => getStock(product) > 0)
              .slice(0, 4)
              .map((product) => (
                <div key={product.id} className="bg-white p-3 rounded-lg border border-green-200">
                  <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                  <p className="text-sm text-gray-600">₹{product.price}/{product.unit}</p>
                  <p className="text-xs text-green-600 font-medium mt-1">{getStock(product)} in stock</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nearby Farmers</h2>
              <p className="text-sm text-gray-600">Showing farmers near your current location.</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/location')}>
              View Full Map
            </Button>
          </div>

          {nearbyFarmers.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                {nearbyFarmers.map((farmer) => (
                  <div key={farmer.id} className="rounded-lg border bg-white p-3">
                    <p className="font-semibold text-gray-900">{farmer.name}</p>
                    <p className="text-sm text-gray-600">{farmer.location}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
                      <span>{farmer.productsCount} products</span>
                      <span>⭐ {farmer.averageRating > 0 ? farmer.averageRating.toFixed(1) : 'N/A'}</span>
                      {farmer.distance !== null && (
                        <span className="flex items-center gap-1 text-blue-700">
                          <MapPin className="h-3 w-3" />
                          {farmer.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg overflow-hidden border h-72 bg-white">
                {mapSrc ? (
                  <iframe title="Nearby farmers map" src={mapSrc} className="h-full w-full" loading="lazy" />
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-600">
                    Enable location coordinates to view map.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-gray-600">
              No nearby farmers with live product listings found yet.
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Browse Products</h2>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search crops, farmers, location..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="pl-10 h-12 text-base"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              maxPrice={500}
            />
          </div>

          <div className="lg:col-span-3">
            {filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => (
                    <BuyerProductCard
                      key={product.id}
                      product={product}
                      farmer={getFarmerDetails(product.farmerId, product.farmerName)}
                      onAddToCart={handleAddToCart}
                      onViewDetails={(selectedProduct) => navigate(`/product/${selectedProduct.id}`)}
                      isFavorite={isFavoriteProduct(product.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    Showing {filteredProducts.length} of {products.length} products
                  </p>
                </div>
              </>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-4">🌾</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    searchTerm: '',
                    category: 'all',
                    priceRange: [0, 500],
                    location: '',
                    distanceKm: 'all',
                    sortBy: 'popular',
                  })}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {buyerOrders.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">My Orders</h3>
            </div>
            <div className="space-y-2">
              {buyerOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-gray-900">{order.productName}</p>
                    <p className="text-sm text-gray-600">Farmer: {order.farmerName}</p>
                    <p className="text-sm text-gray-600">Qty {order.quantity} · {order.status}</p>
                    <p className="text-xs text-gray-500">Order ID: {order.id}</p>
                  </div>
                  <p className="font-semibold text-gray-900">₹{order.totalPrice}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BuyerMarketplacePanel;
