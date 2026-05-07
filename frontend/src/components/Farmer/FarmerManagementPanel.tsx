import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, ShoppingCart, TrendingUp, CheckCircle, Sprout, Wallet, Star, Package } from 'lucide-react';
import { hasFarmerPaymentDetails, isProfileComplete, useAuth } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';
import AddProductForm, { Product as FormProduct } from '@/components/Farmer/AddProductForm';
import ProductList from '@/components/Farmer/ProductList';
import { Product, Order } from '@/lib/data';
import { useNavigate, useSearchParams } from 'react-router-dom';

const getTodayIsoDate = () => new Date().toISOString().split('T')[0];
const isAcceptedPipelineStatus = (status: Order['status']) => ['accepted', 'confirmed', 'shipped'].includes(status);

const getOrderStatusView = (status: Order['status']) => {
  if (status === 'delivered') {
    return { label: 'Delivered', className: 'bg-emerald-100 text-emerald-700' };
  }

  if (isAcceptedPipelineStatus(status)) {
    return { label: 'Processing', className: 'bg-blue-100 text-blue-700' };
  }

  if (status === 'cancelled') {
    return { label: 'Rejected', className: 'bg-red-100 text-red-700' };
  }

  return { label: 'Pending', className: 'bg-amber-100 text-amber-800' };
};

const FarmerManagementPanel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { products, orders, addProduct, updateProduct, deleteProduct, updateOrder, addMessage } = useGlobalState();
  const initialTab = searchParams.get('tab') === 'add-product' ? 'add-product' : 'products';
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'profile' | 'add-product'>(initialTab);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const hasProfileDetails = currentUser ? isProfileComplete(currentUser) : false;
  const hasPaymentDetails = currentUser ? hasFarmerPaymentDetails(currentUser) : false;
  const canUploadProducts = hasProfileDetails && hasPaymentDetails;

  const getUploadBlockMessage = () => {
    if (!hasProfileDetails) {
      return 'Complete your profile first.';
    }

    if (!hasPaymentDetails) {
      return 'Add payment details to continue.';
    }

    return '';
  };

  // Removed forced tab-switching effect to prevent flicker/jump during `add-product` attempts.
  // Farmer dashboard controls `add-product` eligibility in openAddDialog now.

  const handleTabChange = (value: string) => {
    if (value !== 'products' && value !== 'orders' && value !== 'profile' && value !== 'add-product') {
      return;
    }

    setActiveTab(value);

    const nextParams = new URLSearchParams(searchParams);
    if (value === 'add-product') {
      nextParams.set('tab', 'add-product');
    } else {
      nextParams.delete('tab');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const farmerProducts = useMemo(
    () => products.filter((product) => product.farmerId === currentUser?.id),
    [products, currentUser?.id]
  );

  const farmerOrders = useMemo(
    () => orders.filter((order) => order.farmerId === currentUser?.id),
    [orders, currentUser?.id]
  );

  const stats = useMemo(() => {
    const totalInventory = farmerProducts.reduce((sum, product) => sum + (product.stock ?? product.quantity), 0);
    const totalRevenue = farmerOrders
      .filter((order) => order.status === 'delivered')
      .reduce((sum, order) => sum + order.totalPrice, 0);
    const totalReviews = farmerProducts.reduce((sum, product) => sum + (product.reviews ?? 0), 0);
    const weightedRatingTotal = farmerProducts.reduce(
      (sum, product) => sum + (product.rating ?? 0) * (product.reviews ?? 0),
      0
    );
    const averageRating = totalReviews > 0 ? weightedRatingTotal / totalReviews : 0;

    return {
      totalProducts: farmerProducts.length,
      activeProducts: farmerProducts.filter((product) => (product.stock ?? product.quantity) > 0).length,
      totalInventory,
      totalOrders: farmerOrders.length,
      pendingOrders: farmerOrders.filter((order) => order.status === 'pending').length,
      deliveredOrders: farmerOrders.filter((order) => order.status === 'delivered').length,
      totalRevenue,
      totalReviews,
      averageRating,
    };
  }, [farmerProducts, farmerOrders]);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(''), 3000);
  };

  const openAddDialog = () => {
    if (!canUploadProducts) {
      setPaymentErrorMessage(getUploadBlockMessage());

      if (!hasProfileDetails) {
        navigate('/complete-profile?warning=profile-required');
        return;
      }

      navigate('/farmer/payment-setup?warning=payment-required');
      return;
    }

    setEditingProduct(null);
    setActiveTab('add-product');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', 'add-product');
    setSearchParams(nextParams, { replace: true });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsProductDialogOpen(true);
  };

  const closeProductDialog = () => {
    setIsProductDialogOpen(false);
    setEditingProduct(null);
  };

  const buildProductPayload = (formProduct: Omit<FormProduct, 'id' | 'createdAt'>, existingProduct?: Product): Product => ({
    id: existingProduct?.id ?? Date.now().toString(),
    name: formProduct.name,
    description: formProduct.description,
    price: formProduct.price,
    unit: formProduct.unit,
    stock: formProduct.stock,
    quantity: formProduct.stock,
    farmerId: currentUser.id,
    farmerName: currentUser.name,
    location: formProduct.location,
    category: formProduct.category,
    image: formProduct.image,
    rating: existingProduct?.rating ?? 0,
    reviews: existingProduct?.reviews ?? 0,
    available: formProduct.stock > 0,
    harvestDate: existingProduct?.harvestDate ?? getTodayIsoDate(),
    createdAt: existingProduct?.createdAt ?? new Date().toISOString(),
  });

  const handleSaveProduct = async (formProduct: Omit<FormProduct, 'id' | 'createdAt'>) => {
    if (!canUploadProducts) {
      setPaymentErrorMessage(getUploadBlockMessage());
      return;
    }

    const payload = buildProductPayload(formProduct, editingProduct ?? undefined);
    const wasEditing = Boolean(editingProduct);

    try {
      if (wasEditing) {
        await updateProduct(editingProduct.id, payload);
        showSuccess(`"${payload.name}" updated successfully.`);
      } else {
        await addProduct(payload);
        showSuccess(`"${payload.name}" added successfully.`);
      }
    } catch (error) {
      console.error('Product save failed', error);
      showSuccess('Failed to save product, please try again.');
    }

    closeProductDialog();

    if (!wasEditing) {
      handleTabChange('products');
    }
  };

  const handleDeleteProduct = (productId: string) => {
    const product = farmerProducts.find((item) => item.id === productId);
    deleteProduct(productId);
    if (product) {
      showSuccess(`"${product.name}" deleted successfully.`);
    }
  };

  const handleUpdateStock = (productId: string, stock: number) => {
    const product = farmerProducts.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    updateProduct(productId, {
      stock,
      quantity: stock,
      available: stock > 0,
    });
    showSuccess(`Stock updated for "${product.name}".`);
  };

  const handleAcceptOrder = (order: Order) => {
    if (order.status !== 'pending') {
      return;
    }

    updateOrder(order.id, { status: 'confirmed' });
    addMessage({
      id: `message_order_accept_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      recipientId: order.buyerId,
      recipientName: order.buyerName,
      content: `Your order #${order.id} for ${order.productName} is now Processing.`,
      timestamp: new Date().toISOString(),
      read: false,
    });
  };

  const handleRejectOrder = (order: Order) => {
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return;
    }

    updateOrder(order.id, { status: 'cancelled' });
    addMessage({
      id: `message_order_reject_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      recipientId: order.buyerId,
      recipientName: order.buyerName,
      content: `Your order #${order.id} for ${order.productName} was rejected. Please contact us for details.`,
      timestamp: new Date().toISOString(),
      read: false,
    });
  };

  const handleMarkDelivered = (order: Order) => {
    if (!isAcceptedPipelineStatus(order.status)) {
      return;
    }

    updateOrder(order.id, {
      status: 'delivered',
      deliveryDate: new Date().toISOString().split('T')[0],
    });

    addMessage({
      id: `message_order_delivered_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      recipientId: order.buyerId,
      recipientName: order.buyerName,
      content: `Your order #${order.id} for ${order.productName} is marked as Delivered. Thank you for buying from us.`,
      timestamp: new Date().toISOString(),
      read: false,
    });
  };

  const handleChatWithBuyer = (order: Order) => {
    const draft = encodeURIComponent(`Hi ${order.buyerName}, regarding your order #${order.id} (${order.productName})`);
    navigate(`/messages?partnerId=${order.buyerId}&orderId=${order.id}&productName=${encodeURIComponent(order.productName)}&draft=${draft}`);
  };

  return (
    <div className="space-y-6 pb-8">
      <Card className="border-0 shadow-sm bg-emerald-700 text-white">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Farmer Dashboard</h1>
              <p className="mt-2 text-emerald-100">
                Manage products, orders, and profile from one clean control center.
              </p>
            </div>
            <Button className="bg-white text-emerald-700 hover:bg-emerald-50 gap-2" onClick={openAddDialog}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardContent>
      </Card>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {paymentErrorMessage && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-900">
          <AlertDescription>{paymentErrorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">My Products</p>
              <Sprout className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.activeProducts} active listings</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Orders Received</p>
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.totalOrders}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.pendingOrders} pending</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">₹{stats.totalRevenue.toFixed(0)}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.deliveredOrders} delivered orders</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Ratings</p>
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
            </p>
            <p className="text-sm text-gray-500 mt-1">{stats.totalReviews} reviews</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="add-product" className="gap-2" disabled={!canUploadProducts}>
            <Plus className="h-4 w-4" />
            Add Listing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductList
            products={farmerProducts}
            onEdit={openEditDialog}
            onDelete={handleDeleteProduct}
            onUpdateStock={handleUpdateStock}
            onAddNew={openAddDialog}
            isFarmerView={true}
            allowActions={true}
          />
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Orders Received</CardTitle>
              <CardDescription>Orders placed by buyers for your products</CardDescription>
            </CardHeader>
            <CardContent>
              {farmerOrders.length > 0 ? (
                <div className="space-y-4">
                  {farmerOrders.map((order) => {
                    const statusView = getOrderStatusView(order.status);

                    return (
                      <div key={order.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{order.productName}</h3>
                            <Badge variant="secondary" className={statusView.className}>{statusView.label}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">Buyer: {order.buyerName}</p>
                          <p className="text-sm text-gray-600">Qty: {order.quantity} | Ordered: {order.orderDate}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="font-semibold text-gray-900">₹{order.totalPrice}</p>
                          <p className="text-sm text-gray-600">Order ID: {order.id}</p>
                          <div className="mt-2 flex flex-wrap gap-2 md:justify-end">
                            {order.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => handleAcceptOrder(order)}>
                                Accept
                              </Button>
                            )}
                            {isAcceptedPipelineStatus(order.status) && (
                              <Button size="sm" variant="outline" onClick={() => handleMarkDelivered(order)}>
                                Mark Delivered
                              </Button>
                            )}
                            {order.status !== 'delivered' && order.status !== 'cancelled' && (
                              <Button size="sm" variant="destructive" onClick={() => handleRejectOrder(order)}>
                                Reject
                              </Button>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => handleChatWithBuyer(order)}>
                              Chat Buyer
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-600">
                  No orders received yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Farm Profile</CardTitle>
              <CardDescription>Your account summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Logged in as</p>
                <p className="font-semibold text-gray-900">{currentUser.name}</p>
                <p className="text-sm text-gray-600">{currentUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Farm Name</p>
                <p className="font-medium text-gray-900">{currentUser.farmName || `${currentUser.name}'s Farm`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{currentUser.phone || 'Not added yet'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Crop Types</p>
                <p className="font-medium text-gray-900">
                  {(currentUser.cropTypes ?? []).length > 0
                    ? (currentUser.cropTypes ?? []).join(', ')
                    : 'Not added yet'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Details</p>
                <p className="font-medium text-gray-900">
                  {hasPaymentDetails ? 'Completed' : 'Not setup'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">{currentUser.role}</Badge>
                <Badge variant="secondary">{currentUser.location}</Badge>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/farmer/payment-setup')}
              >
                {hasPaymentDetails ? 'Update Payment Details' : 'Add Payment Details'}
              </Button>
              <div>
                <p className="text-sm text-gray-600">Farm Bio</p>
                <p className="text-sm text-gray-800">
                  {currentUser.farmDetails || 'Add your farm bio from Edit Profile to help buyers trust your produce.'}
                </p>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => navigate('/profile?edit=true')}
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add-product">
          <Card>
            <CardHeader>
              <CardTitle>Add New Listing</CardTitle>
              <CardDescription>Create a product listing and publish it immediately.</CardDescription>
            </CardHeader>
            <CardContent>
              <AddProductForm
                submitLabel="Add Product"
                title="Add New Product"
                description="List a new product to sell on the marketplace."
                onSubmit={handleSaveProduct}
                onCancel={() => handleTabChange('products')}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update the product details and save your changes.' : 'Create a new product listing for your farm.'}
            </DialogDescription>
          </DialogHeader>
          <AddProductForm
            initialProduct={editingProduct}
            submitLabel={editingProduct ? 'Save Changes' : 'Add Product'}
            title={editingProduct ? 'Edit Product' : 'Add New Product'}
            description={editingProduct ? 'Update the product information below.' : 'List a new product to sell on the marketplace.'}
            onSubmit={handleSaveProduct}
            onCancel={closeProductDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerManagementPanel;
