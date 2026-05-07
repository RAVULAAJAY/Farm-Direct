import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Compass, Heart, MapPin, MessageSquare, ShoppingBag, Star, Truck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';

const BuyerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { products, orders, favoriteProductIds, getNotificationsByUser } = useGlobalState();

  const buyerOrders = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return orders.filter((order) => order.buyerId === currentUser.id);
  }, [currentUser, orders]);

  const userNotifications = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return getNotificationsByUser(currentUser.id);
  }, [currentUser, getNotificationsByUser]);

  const nearbyProducts = useMemo(() => {
    if (!currentUser?.location) {
      return [];
    }

    const cityHint = currentUser.location.split(',')[0].trim().toLowerCase();
    return products
      .filter((product) => (product.stock ?? product.quantity) > 0)
      .filter((product) => product.location.toLowerCase().includes(cityHint))
      .slice(0, 4);
  }, [currentUser?.location, products]);

  const trendingProducts = useMemo(() => {
    return [...products]
      .filter((product) => (product.stock ?? product.quantity) > 0)
      .sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))
      .slice(0, 4);
  }, [products]);

  const recentOrders = useMemo(() => {
    return [...buyerOrders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 4);
  }, [buyerOrders]);

  const stats = {
    ordersPlaced: buyerOrders.length,
    activeOrders: buyerOrders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled').length,
    savedProducts: favoriteProductIds.length,
    unreadNotifications: userNotifications.filter((item) => !item.read).length,
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="border-0 bg-gradient-to-r from-sky-700 via-blue-700 to-cyan-700 text-white shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Welcome, {currentUser.name}</h1>
              <p className="mt-2 text-blue-100">Your smart buyer dashboard for nearby farm-fresh shopping.</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                <MapPin className="h-3 w-3" />
                {currentUser.location}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <Button className="h-full min-h-[92px] w-full flex-col gap-2 whitespace-normal bg-white px-4 py-4 text-center text-blue-700 hover:bg-blue-50" onClick={() => navigate('/browse')}>
                <Compass className="h-5 w-5" />
                Explore
              </Button>
              <Button className="h-full min-h-[92px] w-full flex-col gap-2 whitespace-normal bg-white px-4 py-4 text-center text-blue-700 hover:bg-blue-50" onClick={() => navigate('/orders')}>
                <Truck className="h-5 w-5" />
                Orders
              </Button>
              <Button className="h-full min-h-[92px] w-full flex-col gap-2 whitespace-normal bg-white px-4 py-4 text-center text-blue-700 hover:bg-blue-50" onClick={() => navigate('/messages')}>
                <MessageSquare className="h-5 w-5" />
                Chat
              </Button>
              <Button className="h-full min-h-[92px] w-full flex-col gap-2 whitespace-normal bg-white px-4 py-4 text-center text-blue-700 hover:bg-blue-50" onClick={() => navigate('/notifications')}>
                <Bell className="h-5 w-5" />
                Alerts
              </Button>
              <Button className="h-full min-h-[92px] w-full flex-col gap-2 whitespace-normal bg-white px-4 py-4 text-center leading-tight text-blue-700 hover:bg-blue-50 col-span-2 sm:col-span-1 xl:col-span-1" onClick={() => navigate('/ratings')}>
                <Star className="h-5 w-5" />
                <span className="max-w-[110px] text-center">Ratings & Reviews</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Orders Placed</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.ordersPlaced}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Active Orders</p>
            <p className="mt-1 text-3xl font-bold text-amber-600">{stats.activeOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Saved Products</p>
            <p className="mt-1 text-3xl font-bold text-rose-600">{stats.savedProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Unread Alerts</p>
            <p className="mt-1 text-3xl font-bold text-blue-600">{stats.unreadNotifications}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nearby Results</CardTitle>
            <CardDescription>Products close to your selected location</CardDescription>
          </CardHeader>
          <CardContent>
            {nearbyProducts.length > 0 ? (
              <div className="space-y-3">
                {nearbyProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-700">₹{product.price}/{product.unit}</p>
                      <p className="text-xs text-gray-500">{product.stock ?? product.quantity} available</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No nearby products yet. Explore all listings to find more.</p>
            )}
            <Button className="mt-4 w-full" variant="outline" onClick={() => navigate('/browse')}>
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trending This Week</CardTitle>
            <CardDescription>Popular products with high buyer engagement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {trendingProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <Badge variant="secondary">{product.reviews ?? 0} reviews</Badge>
                    <span>{product.location}</span>
                  </div>
                </div>
                <p className="font-semibold text-emerald-700">₹{product.price}/{product.unit}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest purchases and delivery status</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{order.productName}</p>
                    <p className="text-sm text-gray-600">Farmer: {order.farmerName}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="font-semibold text-gray-900">₹{order.totalPrice}</p>
                    <Badge variant="secondary" className="capitalize mt-1">{order.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">No orders yet. Start exploring fresh farm products.</p>
              <Button className="mt-3" onClick={() => navigate('/browse')}>
                Start Shopping
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Picks</CardTitle>
          <CardDescription>Your wishlist and quick re-order area</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <Heart className="h-4 w-4 text-rose-500" />
            {stats.savedProducts} saved product{stats.savedProducts === 1 ? '' : 's'}
          </div>
          <Button variant="outline" onClick={() => navigate('/favorites')}>
            Manage Wishlist
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerDashboardPage;
