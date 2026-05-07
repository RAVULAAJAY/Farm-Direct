import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, DollarSign, History, LogOut, Package, Shield, ShoppingCart, Trash2, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGlobalState } from '@/context/GlobalStateContext';
import { User } from '@/context/AuthContext';
import { useLocation } from 'react-router-dom';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const statusClasses: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-800',
  accepted: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const deliveryStatusClasses: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-800',
  'ready-for-pickup': 'bg-cyan-100 text-cyan-800',
  'out-for-delivery': 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const roleBadgeClasses: Record<string, string> = {
  farmer: 'bg-green-100 text-green-800',
  buyer: 'bg-blue-100 text-blue-800',
  admin: 'bg-purple-100 text-purple-800',
};

const moderationKeywords = ['fake', 'illegal', 'weapon', 'drug', 'adult'];

const isPotentiallyInappropriateListing = (name: string, description: string) => {
  const searchable = `${name} ${description}`.toLowerCase();
  return moderationKeywords.some((keyword) => searchable.includes(keyword));
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const {
    currentUser,
    users,
    products,
    orders,
    activityLogs,
    deleteUser,
    blockUser,
    enableUser,
    deleteProduct,
    updateOrder,
    deleteOrder,
  } = useGlobalState();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');

    if (tab === 'buyers' || tab === 'products' || tab === 'orders' || tab === 'overview' || tab === 'farmers' || tab === 'activity') {
      setActiveTab(tab);
    }
  }, [location.search]);

  const allUsers = useMemo(() => {
    const adminUser = currentUser?.role === 'admin' ? [currentUser] : [];
    const mergedUsers = [...adminUser, ...users].filter(
      (entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index
    );

    if (!searchQuery.trim()) {
      return mergedUsers;
    }

    const query = searchQuery.toLowerCase();
    return mergedUsers.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.email.toLowerCase().includes(query) ||
        entry.location.toLowerCase().includes(query) ||
        entry.role.toLowerCase().includes(query)
    );
  }, [currentUser, searchQuery, users]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return products;
    }

    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.farmerName.toLowerCase().includes(query) ||
        product.location.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) {
      return orders;
    }

    const query = searchQuery.toLowerCase();
    return orders.filter(
      (order) =>
        order.productName.toLowerCase().includes(query) ||
        order.buyerName.toLowerCase().includes(query) ||
        order.farmerName.toLowerCase().includes(query) ||
        order.status.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  const filteredActivityLogs = useMemo(() => {
    if (!searchQuery.trim()) {
      return activityLogs;
    }

    const query = searchQuery.toLowerCase();
    return activityLogs.filter(
      (entry) =>
        entry.userName.toLowerCase().includes(query) ||
        entry.userRole.toLowerCase().includes(query) ||
        entry.action.toLowerCase().includes(query) ||
        (entry.details ?? '').toLowerCase().includes(query)
    );
  }, [activityLogs, searchQuery]);

  const filteredFarmers = useMemo(() => {
    const farmers = allUsers.filter((entry) => entry.role === 'farmer');

    return farmers.map((farmer) => {
      const farmerProducts = products.filter((product) => product.farmerId === farmer.id);

      return {
        farmer,
        products: farmerProducts,
      };
    });
  }, [allUsers, products]);

  const filteredBuyers = useMemo(() => {
    const buyers = allUsers.filter((entry) => entry.role === 'buyer');

    return buyers.map((buyer) => {
      const uploadedProducts = products.filter((product) => product.farmerId === buyer.id);

      return {
        buyer,
        uploadedProducts,
      };
    });
  }, [allUsers, products]);

  const revenueStats = useMemo(() => {
    const deliveredOrders = orders.filter((order) => order.status === 'delivered');
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.totalPrice, 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyRevenue = deliveredOrders
      .filter((order) => {
        const sourceDate = order.deliveryDate ?? order.orderDate;
        const parsedDate = new Date(sourceDate);
        return parsedDate.getMonth() === currentMonth && parsedDate.getFullYear() === currentYear;
      })
      .reduce((sum, order) => sum + order.totalPrice, 0);

    const farmerRevenueMap = new Map<string, number>();
    deliveredOrders.forEach((order) => {
      const currentValue = farmerRevenueMap.get(order.farmerName) ?? 0;
      farmerRevenueMap.set(order.farmerName, currentValue + order.totalPrice);
    });

    const topFarmer = Array.from(farmerRevenueMap.entries())
      .sort((left, right) => right[1] - left[1])[0];

    return {
      totalRevenue,
      monthlyRevenue,
      deliveredCount: deliveredOrders.length,
      topFarmerName: topFarmer?.[0] ?? 'N/A',
      topFarmerRevenue: topFarmer?.[1] ?? 0,
    };
  }, [orders]);

  const transactionStats = useMemo(() => {
    const deliveredTransactions = orders.filter((order) => order.status === 'delivered').length;
    const activeDeliveries = orders.filter((order) => order.deliveryStatus === 'out-for-delivery').length;
    const pickupTransactions = orders.filter((order) => order.deliveryOption === 'pickup').length;
    const deliveryTransactions = orders.filter((order) => order.deliveryOption === 'delivery').length;

    return {
      totalTransactions: orders.length,
      deliveredTransactions,
      activeDeliveries,
      pickupTransactions,
      deliveryTransactions,
    };
  }, [orders]);

  const stats = {
    totalUsers: allUsers.length,
    totalFarmers: allUsers.filter((entry) => entry.role === 'farmer').length,
    totalBuyers: allUsers.filter((entry) => entry.role === 'buyer').length,
    totalProducts: products.length,
    totalOrders: orders.length,
    pendingOrders: orders.filter((order) => order.status === 'pending').length,
  };

  const handleRemoveUser = (userId: string) => {
    deleteUser(userId);
  };

  const handleBlockUser = (userId: string) => {
    blockUser(userId);
  };

  const handleEnableUser = (userId: string) => {
    enableUser(userId);
  };

  const handleDeleteProduct = (productId: string) => {
    deleteProduct(productId);
  };

  const handleAdvanceOrderStatus = (orderId: string, currentStatus: string) => {
    const statusFlow: Array<'pending' | 'accepted' | 'shipped' | 'delivered'> = ['pending', 'accepted', 'shipped', 'delivered'];
    const currentIndex = statusFlow.indexOf(currentStatus as 'pending' | 'accepted' | 'shipped' | 'delivered');

    if (currentIndex < 0 || currentIndex === statusFlow.length - 1) {
      return;
    }

    const nextStatus = statusFlow[currentIndex + 1];
    updateOrder(orderId, {
      status: nextStatus,
      deliveryStatus:
        nextStatus === 'shipped'
          ? 'out-for-delivery'
          : nextStatus === 'delivered'
          ? 'delivered'
          : 'pending',
      ...(nextStatus === 'delivered' ? { deliveryDate: new Date().toISOString().split('T')[0] } : {}),
    });
  };

  const handleCancelOrder = (orderId: string) => {
    updateOrder(orderId, {
      status: 'cancelled',
      deliveryStatus: 'cancelled',
    });
  };

  const handleDeleteOrder = (orderId: string) => {
    deleteOrder(orderId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="border-b border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-600">FarmDirect administration and moderation</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <Button onClick={onLogout} variant="outline" className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Live platform overview</h2>
            <p className="text-gray-600">Browse all users, products, and orders. Remove users from state when needed.</p>
          </div>

          <div className="w-full max-w-xl">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search users, products, or orders..."
              className="bg-white"
            />
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Users className="h-4 w-4" />
                Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Package className="h-4 w-4" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <ShoppingCart className="h-4 w-4" />
                Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <BarChart3 className="h-4 w-4" />
                Farmers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{stats.totalFarmers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Users className="h-4 w-4" />
                Buyers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBuyers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <DollarSign className="h-4 w-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-700">₹{revenueStats.totalRevenue.toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 gap-2 bg-white p-1 shadow-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="farmers">Farmers</TabsTrigger>
            <TabsTrigger value="buyers">Buyers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Snapshot</CardTitle>
                <CardDescription>Key counts pulled directly from the shared app state</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Users</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Products</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
                  </div>
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Orders</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
                  </div>
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Revenue</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">₹{revenueStats.totalRevenue.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Stats</CardTitle>
                <CardDescription>Delivered-order earnings and growth indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Delivered Orders</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{revenueStats.deliveredCount}</p>
                  </div>
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">This Month</p>
                    <p className="mt-2 text-3xl font-bold text-blue-700">₹{revenueStats.monthlyRevenue.toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Top Farmer</p>
                    <p className="mt-2 text-xl font-bold text-gray-900">{revenueStats.topFarmerName}</p>
                  </div>
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Top Farmer Revenue</p>
                    <p className="mt-2 text-3xl font-bold text-purple-700">₹{revenueStats.topFarmerRevenue.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="farmers" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Farmers</CardTitle>
                <CardDescription>
                  View registration details, login activity, products uploaded, and account controls.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[560px] pr-4">
                  <div className="space-y-4">
                    {filteredFarmers.map(({ farmer, products: farmerProducts }) => (
                      <div key={farmer.id} className="rounded-xl border bg-white p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{farmer.name}</h3>
                            <p className="text-sm text-gray-600">{farmer.email}</p>
                          </div>
                          <Badge className={roleBadgeClasses[farmer.role] ?? 'bg-gray-100 text-gray-800'}>
                            {farmer.role}
                          </Badge>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Farm name</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{farmer.farmName || 'Not added'}</p>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Location</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{farmer.location || 'Not added'}</p>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Contact</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{farmer.phone || 'Not added'}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Farm details</p>
                          <p className="text-sm text-gray-800 mt-1">{farmer.farmDetails || 'Not added'}</p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Registration</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {farmer.createdAt ? new Date(farmer.createdAt).toLocaleString() : 'Not available'}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Last login</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {farmer.lastLoginAt ? new Date(farmer.lastLoginAt).toLocaleString() : 'Never logged in'}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Login count</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{farmer.loginCount ?? 0}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Payment details</p>
                          <div className="mt-2 grid gap-2 md:grid-cols-3">
                            <p className="text-sm text-gray-800">Bank: {farmer.paymentDetails?.bankName || 'Not added'}</p>
                            <p className="text-sm text-gray-800">Account: {farmer.paymentDetails?.accountNumber || 'Not added'}</p>
                            <p className="text-sm text-gray-800">IFSC/UPI: {farmer.paymentDetails?.ifscOrUpi || 'Not added'}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border bg-gray-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-500">Products</p>
                            <Badge variant="secondary">{farmerProducts.length}</Badge>
                          </div>
                          {farmerProducts.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {farmerProducts.map((product) => (
                                <div key={product.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-3 py-2">
                                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                  <p className="text-sm text-gray-600">₹{product.price} · Qty {product.quantity} {product.unit}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-gray-500">No products listed yet.</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge className={farmer.isActive === false ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}>
                            {farmer.isActive === false ? 'Disabled' : 'Enabled'}
                          </Badge>
                          {farmer.isActive === false ? (
                            <Button size="sm" variant="outline" onClick={() => handleEnableUser(farmer.id)}>
                              Enable User
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleBlockUser(farmer.id)}>
                              Disable User
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => handleRemoveUser(farmer.id)}>
                            Delete User
                          </Button>
                        </div>
                      </div>
                    ))}

                    {filteredFarmers.length === 0 && (
                      <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
                        No farmers match your search.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="buyers" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Buyers</CardTitle>
                <CardDescription>
                  View registration details, login activity, products uploaded, and account controls.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[560px] pr-4">
                  <div className="space-y-3">
                    {filteredBuyers.map(({ buyer, uploadedProducts }) => (
                      <div key={buyer.id} className="rounded-xl border bg-white p-4 space-y-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                            {buyer.name
                              .split(' ')
                              .slice(0, 2)
                              .map((part) => part.charAt(0))
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-semibold text-gray-900">{buyer.name}</h3>
                              <Badge className={roleBadgeClasses[buyer.role] ?? 'bg-gray-100 text-gray-800'}>
                                {buyer.role}
                              </Badge>
                              {currentUser?.id === buyer.id && <Badge variant="secondary">Current user</Badge>}
                            </div>
                            <p className="truncate text-sm text-gray-600">{buyer.email}</p>
                            <p className="text-sm text-gray-500">{buyer.location}</p>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Registration</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {buyer.createdAt ? new Date(buyer.createdAt).toLocaleString() : 'Not available'}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Last login</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {buyer.lastLoginAt ? new Date(buyer.lastLoginAt).toLocaleString() : 'Never logged in'}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Login count</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{buyer.loginCount ?? 0}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border bg-gray-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-500">Listings by this buyer</p>
                            <Badge variant="secondary">{uploadedProducts.length}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            This section helps identify unusual listing activity on buyer accounts.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <Badge className={buyer.isActive === false ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}>
                            {buyer.isActive === false ? 'Disabled' : 'Enabled'}
                          </Badge>
                          {buyer.isActive === false ? (
                            <Button
                              variant="outline"
                              onClick={() => handleEnableUser(buyer.id)}
                              disabled={currentUser?.id === buyer.id}
                            >
                              Enable
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => handleBlockUser(buyer.id)}
                              disabled={currentUser?.id === buyer.id}
                            >
                              Disable
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            onClick={() => handleRemoveUser(buyer.id)}
                            disabled={currentUser?.id === buyer.id}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}

                    {filteredBuyers.length === 0 && (
                      <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
                        No buyers match your search.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>View all listings and remove inappropriate products immediately</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[560px] pr-4">
                  <div className="space-y-3">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="rounded-xl border bg-white p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {isPotentiallyInappropriateListing(product.name, product.description) && (
                                <Badge className="bg-amber-100 text-amber-900">Potentially Inappropriate</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{product.name}</h3>
                              <Badge variant={product.available ? 'default' : 'secondary'}>
                                {product.available ? 'Available' : 'Unavailable'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{product.description}</p>
                            <p className="text-sm text-gray-500">
                              {product.category} • {product.location} • Farmer: {product.farmerName}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900">₹{product.price}</p>
                            <p className="text-sm text-gray-500">Qty: {product.quantity} {product.unit}</p>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="mt-2 gap-1"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove Listing
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredProducts.length === 0 && (
                      <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
                        No products match your search.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Total Transactions</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{transactionStats.totalTransactions}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Delivered</p>
                  <p className="mt-2 text-3xl font-bold text-green-700">{transactionStats.deliveredTransactions}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Active Deliveries</p>
                  <p className="mt-2 text-3xl font-bold text-purple-700">{transactionStats.activeDeliveries}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Pickup Orders</p>
                  <p className="mt-2 text-3xl font-bold text-cyan-700">{transactionStats.pickupTransactions}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Delivery Orders</p>
                  <p className="mt-2 text-3xl font-bold text-blue-700">{transactionStats.deliveryTransactions}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>Track every transaction and monitor delivery progress in real time</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[560px] pr-4">
                  <div className="space-y-3">
                    {filteredOrders.map((order) => (
                      <div key={order.id} className="rounded-xl border bg-white p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{order.productName}</h3>
                              <Badge className={statusClasses[order.status] ?? 'bg-gray-100 text-gray-800'}>
                                {order.status}
                              </Badge>
                              <Badge className={deliveryStatusClasses[order.deliveryStatus] ?? 'bg-gray-100 text-gray-800'}>
                                {order.deliveryStatus}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              Buyer: {order.buyerName} • Farmer: {order.farmerName}
                            </p>
                            <p className="text-sm text-gray-500">
                              Ordered on {order.orderDate} • Quantity {order.quantity}
                            </p>
                            <p className="text-sm text-gray-500">
                              Mode: {order.deliveryOption === 'pickup' ? 'Pickup' : 'Delivery'}
                              {order.deliveryAddress ? ` • Address: ${order.deliveryAddress}` : ''}
                              {order.pickupLocation ? ` • Pickup: ${order.pickupLocation}` : ''}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900">₹{order.totalPrice}</p>
                            <p className="text-sm text-gray-500">Order ID: {order.id}</p>
                            <div className="mt-2 flex flex-wrap justify-end gap-2">
                              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleAdvanceOrderStatus(order.id, order.status)}
                                >
                                  <TrendingUp className="h-3 w-3" />
                                  Advance
                                </Button>
                              )}
                              {order.status !== 'cancelled' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleCancelOrder(order.id)}
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Cancel
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleDeleteOrder(order.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredOrders.length === 0 && (
                      <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
                        No orders match your search.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>
                  Real-time login/logout tracking and user actions across the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[620px] pr-4">
                  <div className="space-y-3">
                    {filteredActivityLogs.map((entry) => (
                      <div key={entry.id} className="rounded-xl border bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <History className="h-4 w-4 text-emerald-700" />
                              <p className="font-medium text-gray-900">{entry.userName}</p>
                              <Badge className={roleBadgeClasses[entry.userRole] ?? 'bg-gray-100 text-gray-800'}>
                                {entry.userRole}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700">{entry.action}</p>
                            {entry.details && <p className="text-sm text-gray-500">{entry.details}</p>}
                          </div>
                          <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}

                    {filteredActivityLogs.length === 0 && (
                      <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
                        No activity logs match your search.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;