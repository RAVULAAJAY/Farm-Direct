import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, ShoppingCart, MessageSquare, Star, Plus, Eye } from 'lucide-react';
import { User } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';

interface DashboardPageProps {
  user: User;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const {
    products,
    orders,
    messages,
    getNotificationsByUser,
    favoriteProductIds,
    getTotalSpentByBuyer,
  } = useGlobalState();
  const isFarmer = user.role === 'farmer';
  const isBuyer = user.role === 'buyer';

  const farmerProducts = useMemo(
    () => products.filter((product) => product.farmerId === user.id),
    [products, user.id]
  );

  const farmerOrders = useMemo(
    () => orders.filter((order) => order.farmerId === user.id),
    [orders, user.id]
  );

  const farmerDeliveredOrders = useMemo(
    () => farmerOrders.filter((order) => order.status === 'delivered'),
    [farmerOrders]
  );

  const totalRevenue = useMemo(
    () => farmerDeliveredOrders.reduce((sum, order) => sum + order.totalPrice, 0),
    [farmerDeliveredOrders]
  );

  const weeklyRevenue = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    return farmerDeliveredOrders
      .filter((order) => {
        const sourceDate = order.deliveryDate ?? order.orderDate;
        const orderDate = new Date(sourceDate);
        return !Number.isNaN(orderDate.getTime()) && orderDate >= sevenDaysAgo && orderDate <= now;
      })
      .reduce((sum, order) => sum + order.totalPrice, 0);
  }, [farmerDeliveredOrders]);

  const previousWeekRevenue = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    const fourteenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    return farmerDeliveredOrders
      .filter((order) => {
        const sourceDate = order.deliveryDate ?? order.orderDate;
        const orderDate = new Date(sourceDate);
        return !Number.isNaN(orderDate.getTime()) && orderDate >= fourteenDaysAgo && orderDate < sevenDaysAgo;
      })
      .reduce((sum, order) => sum + order.totalPrice, 0);
  }, [farmerDeliveredOrders]);

  const weeklyRevenueChangeLabel = useMemo(() => {
    if (previousWeekRevenue === 0) {
      if (weeklyRevenue === 0) {
        return 'No change vs last week';
      }

      return 'New revenue vs last week';
    }

    const deltaPercentage = ((weeklyRevenue - previousWeekRevenue) / previousWeekRevenue) * 100;
    const sign = deltaPercentage > 0 ? '+' : '';
    return `${sign}${deltaPercentage.toFixed(1)}% vs last week`;
  }, [previousWeekRevenue, weeklyRevenue]);

  const productWiseEarnings = useMemo(() => {
    const earningsMap = new Map<string, number>();

    farmerDeliveredOrders.forEach((order) => {
      const current = earningsMap.get(order.productName) ?? 0;
      earningsMap.set(order.productName, current + order.totalPrice);
    });

    return Array.from(earningsMap.entries())
      .map(([productName, earnings]) => ({ productName, earnings }))
      .sort((a, b) => b.earnings - a.earnings);
  }, [farmerDeliveredOrders]);

  const topProductEarnings = productWiseEarnings[0];

  const buyerOrders = useMemo(
    () => orders.filter((order) => order.buyerId === user.id),
    [orders, user.id]
  );

  const unreadMessages = useMemo(
    () => messages.filter((message) => message.recipientId === user.id && !message.read).length,
    [messages, user.id]
  );

  const userNotifications = useMemo(
    () => getNotificationsByUser(user.id),
    [getNotificationsByUser, user.id]
  );

  const unreadNotificationCount = useMemo(
    () => userNotifications.filter((notification) => !notification.read).length,
    [userNotifications]
  );

  const unreadMessageNotificationCount = useMemo(
    () =>
      userNotifications.filter(
        (notification) => notification.type === 'message' && !notification.read
      ).length,
    [userNotifications]
  );

  const recentFarmerOrders = useMemo(
    () =>
      [...farmerOrders]
        .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
        .slice(0, 3),
    [farmerOrders]
  );

  const featuredProducts = useMemo(
    () =>
      [...products]
        .filter((product) => (product.stock ?? product.quantity) > 0)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [products]
  );

  const handleOpenAddListing = () => {
    navigate('/my-listings?tab=add-product');
  };

  const handleOpenOrders = () => {
    navigate('/orders');
  };

  const handleOpenMessages = () => {
    navigate('/messages');
  };

  const handleOpenPayments = () => {
    navigate('/farmer/payments');
  };

  if (isFarmer) {
    return (
      <div className="space-y-6">
        {/* Header with animation */}
        <div className="animate-fade-in-scale">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Welcome back, {user.name}! 🧑‍🌾</h1>
          <p className="text-gray-600 mt-2">Here's what's happening with your farm today</p>
        </div>

        {/* Key Stats (stable style - no changing gradient overlays) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            {
              icon: ShoppingCart,
              label: 'Active Listings',
              value: `${farmerProducts.filter((product) => (product.stock ?? product.quantity) > 0).length}`,
              change: `${farmerProducts.length} total listings`,
              textColor: 'text-green-600',
            },
            {
              icon: Eye,
              label: 'Orders Received',
              value: `${farmerOrders.length}`,
              change: `${farmerOrders.filter((order) => order.status === 'pending').length} pending`,
              textColor: 'text-blue-600',
            },
            {
              icon: TrendingUp,
              label: 'Total Revenue',
              value: `₹${totalRevenue.toFixed(0)}`,
              change: `${farmerDeliveredOrders.length} delivered orders`,
              textColor: 'text-purple-600',
            },
            {
              icon: Star,
              label: 'Weekly Revenue',
              value: `₹${weeklyRevenue.toFixed(0)}`,
              change: weeklyRevenueChangeLabel,
              textColor: 'text-amber-600',
            },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="card-hover border border-gray-200 shadow-sm bg-white" style={{ animationDelay: `${idx * 50}ms` }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                    {stat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-xs md:text-sm ${stat.textColor} mt-2 font-medium`}>{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="animate-slide-in-bottom card-minimal border-0 shadow-medium">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={handleOpenAddListing}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-2 h-auto py-3 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="h-5 w-5" />
                Add New Listing
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 hover:bg-blue-50 transition-all duration-200"
                onClick={handleOpenMessages}
              >
                <MessageSquare className="h-5 w-5" />
                View Messages ({unreadMessageNotificationCount})
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 hover:bg-amber-50 transition-all duration-200"
                onClick={handleOpenOrders}
              >
                <ShoppingCart className="h-5 w-5" />
                View Orders ({farmerOrders.length})
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 hover:bg-green-50 transition-all duration-200"
                onClick={handleOpenPayments}
              >
                <TrendingUp className="h-5 w-5" />
                Track Payments ({farmerDeliveredOrders.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="animate-slide-in-bottom card-minimal border-0 shadow-medium" style={{ animationDelay: '130ms' }}>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Top Product Earnings</CardTitle>
              <CardDescription>Best-performing delivered product</CardDescription>
            </CardHeader>
            <CardContent>
              {topProductEarnings ? (
                <div className="rounded-lg border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                  <p className="font-semibold text-gray-900">{topProductEarnings.productName}</p>
                  <p className="mt-2 text-2xl font-bold text-green-700">₹{topProductEarnings.earnings.toFixed(0)}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No delivered orders yet to calculate product earnings.</p>
              )}
            </CardContent>
          </Card>

          <Card className="animate-slide-in-bottom card-minimal border-0 shadow-medium" style={{ animationDelay: '160ms' }}>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Product-wise Earnings</CardTitle>
              <CardDescription>Revenue split by delivered products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productWiseEarnings.slice(0, 5).map((item) => (
                  <div key={item.productName} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                    <p className="text-sm font-bold text-purple-700">₹{item.earnings.toFixed(0)}</p>
                  </div>
                ))}
                {productWiseEarnings.length === 0 && (
                  <p className="text-sm text-gray-600">No earnings data available yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="animate-slide-in-bottom card-minimal border-0 shadow-medium" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Recent Orders</CardTitle>
            <CardDescription>Latest orders from buyers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFarmerOrders.length === 0 && (
                <p className="text-sm text-gray-600">No orders yet. New orders will appear here.</p>
              )}
              {recentFarmerOrders.map((order) => (
                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-100 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 group">
                  <div className="mb-3 sm:mb-0">
                    <p className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">{`${order.productName} (${order.quantity})`}</p>
                    <p className="text-sm text-gray-600">From: {order.buyerName}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-green-600 text-lg">₹{order.totalPrice}</p>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isBuyer) {
    return (
      <div className="space-y-6">
        {/* Header with animation */}
        <div className="animate-fade-in-scale">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Welcome back, {user.name}! 🧑‍💼</h1>
          <p className="text-gray-600 mt-2">Discover fresh produce from local farmers</p>
        </div>

        {/* Key Stats - with staggered animation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            {
              icon: ShoppingCart,
              label: 'Orders Placed',
              value: `${buyerOrders.length}`,
              change: `${buyerOrders.filter((order) => order.status === 'pending').length} pending`,
              color: 'from-blue-500 to-cyan-600',
              textColor: 'text-blue-600',
            },
            {
              icon: Eye,
              label: 'Favorites',
              value: `${favoriteProductIds.length}`,
              change: 'Saved products',
              textColor: 'text-pink-600',
            },
            {
              icon: TrendingUp,
              label: 'Total Spent',
              value: `₹${getTotalSpentByBuyer(user.id).toFixed(0)}`,
              change: 'Delivered orders',
              color: 'from-emerald-500 to-green-600',
              textColor: 'text-emerald-600',
            },
            {
              icon: Star,
              label: 'Notifications',
              value: `${unreadNotificationCount}`,
              change: `${unreadMessageNotificationCount} from messages`,
              color: 'from-purple-500 to-violet-600',
              textColor: 'text-purple-600',
            },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="card-hover border border-gray-200 shadow-sm bg-white" style={{ animationDelay: `${idx * 50}ms` }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                    {stat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-xs md:text-sm ${stat.textColor} mt-2 font-medium`}>{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="animate-slide-in-bottom card-minimal border-0 shadow-medium">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={() => navigate('/browse')}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 gap-2 h-auto py-3 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                <ShoppingCart className="h-5 w-5" />
                Browse Listings
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 hover:bg-pink-50 transition-all duration-200"
                onClick={() => navigate('/messages')}
              >
                <MessageSquare className="h-5 w-5" />
                Messages ({unreadMessageNotificationCount})
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 hover:bg-purple-50 transition-all duration-200"
                onClick={() => navigate('/orders')}
              >
                <ShoppingCart className="h-5 w-5" />
                My Orders ({buyerOrders.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Featured Crops */}
        <Card className="animate-slide-in-bottom card-minimal border-0 shadow-medium" style={{ animationDelay: '150ms' }}>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Featured Crops</CardTitle>
            <CardDescription>Fresh picks for you today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {featuredProducts.map((item, idx) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-100 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200 group" style={{ animationDelay: `${idx * 30}ms` }}>
                  <div className="flex items-start gap-3 mb-3 sm:mb-0">
                    <span className="text-2xl">🌾</span>
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{item.name}</p>
                      <p className="text-sm text-gray-600">📍 {item.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <p className="font-bold text-blue-600 text-lg">₹{item.price}/{item.unit}</p>
                    <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1.5 rounded-lg">
                      <span className="text-sm font-medium text-amber-700">⭐ {item.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {featuredProducts.length === 0 && (
                <p className="text-sm text-gray-600">No products available yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-scale">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600">Welcome to your dashboard</p>
    </div>
  );
};

export default DashboardPage;
