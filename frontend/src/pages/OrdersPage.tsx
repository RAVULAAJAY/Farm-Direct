import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import InvoiceModal from '@/components/Orders/InvoiceModal';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Package,
  Truck,
  Download,
  Eye,
  Star,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';
import { Order } from '@/lib/data';

type OrderStatus = 'pending' | 'accepted' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
type DeliveryStatus = 'pending' | 'ready-for-pickup' | 'out-for-delivery' | 'delivered' | 'cancelled';

interface OrdersPageProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'farmer' | 'buyer' | 'admin';
    location?: string;
  };
}

const acceptedPipelineStatuses: OrderStatus[] = ['accepted', 'confirmed', 'shipped'];
const isAcceptedPipelineStatus = (status: OrderStatus) => acceptedPipelineStatuses.includes(status);

const formatDeliveryMethod = (method: Order['deliveryOption']) =>
  method === 'pickup' ? 'Pickup' : 'Delivery';

const formatDeliveryStatus = (status: DeliveryStatus) => {
  if (status === 'ready-for-pickup') {
    return 'Ready for Pickup';
  }

  if (status === 'out-for-delivery') {
    return 'Out for Delivery';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: <Clock className="h-5 w-5" />,
    description: 'Waiting for farmer confirmation',
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <Package className="h-5 w-5" />,
    description: 'Farmer is preparing the order',
  },
  confirmed: {
    label: 'Accepted',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <Package className="h-5 w-5" />,
    description: 'Farmer is preparing the order',
  },
  shipped: {
    label: 'Accepted',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <Package className="h-5 w-5" />,
    description: 'Farmer is preparing the order',
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: <CheckCircle className="h-5 w-5" />,
    description: 'Order completed',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: <AlertCircle className="h-5 w-5" />,
    description: 'Order was cancelled',
  },
};

const OrdersPage: React.FC<OrdersPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderSuccessMessage, setOrderSuccessMessage] = useState('');
  const { currentUser } = useAuth();
  const { users, orders, products, updateOrder, addProductReview, addNotification, addMessage } = useGlobalState();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [ratingError, setRatingError] = useState('');

  const isFarmer = user.role === 'farmer';
  const isBuyer = user.role === 'buyer';
  const activeUserId = currentUser?.id ?? user.id;
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const state = location.state as { orderSuccessMessage?: string } | undefined;
    if (state?.orderSuccessMessage) {
      setOrderSuccessMessage(state.orderSuccessMessage);
    }
  }, [location]);

  const buyerOrders = useMemo(
    () => orders.filter((order) => order.buyerId === activeUserId),
    [activeUserId, orders]
  );

  const farmerOrders = useMemo(
    () => orders.filter((order) => order.farmerId === activeUserId),
    [activeUserId, orders]
  );

  const handleCloseOrderDetail = () => {
    setShowOrderDetail(false);

    if (searchParams.has('orderId')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('orderId');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const visibleOrders = isFarmer ? farmerOrders : buyerOrders;

  const statusCounts = useMemo(() => ({
    all: visibleOrders.length,
    pending: visibleOrders.filter((order) => order.status === 'pending').length,
    accepted: visibleOrders.filter((order) => isAcceptedPipelineStatus(order.status)).length,
    delivered: visibleOrders.filter((order) => order.status === 'delivered').length,
    cancelled: visibleOrders.filter((order) => order.status === 'cancelled').length,
  }), [visibleOrders]);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  const handleViewInvoice = (order: Order) => {
    setSelectedInvoiceOrder(order);
  };

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (!orderId) {
      return;
    }

    const matchedOrder = orders.find((order) => order.id === orderId);
    if (!matchedOrder) {
      return;
    }

    const belongsToUser = matchedOrder.buyerId === activeUserId || matchedOrder.farmerId === activeUserId;
    if (!belongsToUser) {
      return;
    }

    setSelectedOrder(matchedOrder);
    setShowOrderDetail(true);
  }, [searchParams, orders, activeUserId]);

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }

    const latestSelectedOrder = orders.find((order) => order.id === selectedOrder.id);

    if (!latestSelectedOrder) {
      setSelectedOrder(null);
      handleCloseOrderDetail();
      return;
    }

    if (
      latestSelectedOrder.status !== selectedOrder.status ||
      latestSelectedOrder.deliveryDate !== selectedOrder.deliveryDate ||
      latestSelectedOrder.deliveryStatus !== selectedOrder.deliveryStatus
    ) {
      setSelectedOrder(latestSelectedOrder);
    }
  }, [orders, selectedOrder]);

  const updateOrderStatus = (order: Order, status: OrderStatus) => {
    const nextDeliveryStatus: DeliveryStatus =
      status === 'cancelled'
        ? 'cancelled'
        : status === 'delivered'
        ? 'delivered'
        : status === 'shipped'
        ? 'out-for-delivery'
        : status === 'accepted' && order.deliveryOption === 'pickup'
        ? 'ready-for-pickup'
        : 'pending';

    const updates: Partial<Order> = {
      status,
      deliveryStatus: nextDeliveryStatus,
      ...(status === 'delivered' ? { deliveryDate: new Date().toISOString().split('T')[0] } : {}),
    };

    updateOrder(order.id, updates);

    if (isFarmer) {
      addNotification({
        id: `notification_${Date.now()}_${order.id}_${status}`,
        userId: order.buyerId,
        type: 'order',
        title: 'Order status updated',
        message: `Your order ${order.id} for ${order.productName} is now ${status}.`,
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: '/orders',
      });
    }
  };

  const handleAcceptOrder = (order: Order) => {
    if (!isFarmer) {
      return;
    }

    if (order.status !== 'pending') {
      return;
    }

    updateOrderStatus(order, 'accepted');
  };

  const handleRejectOrder = (order: Order) => {
    if (!isFarmer) {
      return;
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      return;
    }

    updateOrderStatus(order, 'cancelled');
  };

  const handleMarkDelivered = (order: Order) => {
    if (!isFarmer) {
      return;
    }

    if (!isAcceptedPipelineStatus(order.status)) {
      return;
    }

    updateOrderStatus(order, 'delivered');
  };

  const handleMarkOutForDelivery = (order: Order) => {
    if (!isFarmer || order.deliveryOption !== 'delivery') {
      return;
    }

    if (!isAcceptedPipelineStatus(order.status)) {
      return;
    }

    updateOrderStatus(order, 'shipped');
  };

  const filteredOrders = (status: OrderStatus | 'all') => {
    if (status === 'all') {
      return visibleOrders;
    }

    if (status === 'accepted') {
      return visibleOrders.filter((order) => isAcceptedPipelineStatus(order.status));
    }

    return visibleOrders.filter((order) => order.status === status);
  };

  const handleOpenOrderChat = (order: Order) => {
    const partnerId = isFarmer ? order.buyerId : order.farmerId;
    const messageDraft = `Hi, I am contacting you regarding order #${order.id} for ${order.productName}.`;
    const query = new URLSearchParams({
      partnerId,
      orderId: order.id,
      productName: order.productName,
      draft: messageDraft,
    });

    navigate(`/messages?${query.toString()}`);
  };

  const selectedInvoiceBuyer = selectedInvoiceOrder ? users.find((entry) => entry.id === selectedInvoiceOrder.buyerId) ?? null : null;
  const selectedInvoiceFarmer = selectedInvoiceOrder ? users.find((entry) => entry.id === selectedInvoiceOrder.farmerId) ?? null : null;
  const selectedInvoiceProduct = selectedInvoiceOrder ? products.find((entry) => entry.id === selectedInvoiceOrder.productId) ?? null : null;

  const handleOpenDeliveryTracking = (order: Order) => {
    if (isFarmer) {
      return;
    }

    const query = new URLSearchParams({ orderId: order.id });
    navigate(`/delivery?${query.toString()}`);
  };

  const handleOpenRatingDialog = (order: Order) => {
    setRatingOrder(order);
    setRatingValue(0);
    setRatingFeedback('');
    setRatingError('');
  };

  const handleSubmitRating = () => {
    if (!ratingOrder || !currentUser || currentUser.role !== 'buyer') {
      return;
    }

    if (ratingValue < 1 || ratingValue > 5) {
      setRatingError('Please select a rating between 1 and 5 stars.');
      return;
    }

    const product = products.find((entry) => entry.id === ratingOrder.productId);
    if (!product) {
      setRatingError('Product not found for this order.');
      return;
    }

    const feedbackText = ratingFeedback.trim();
    const nextTitle = feedbackText ? 'Buyer feedback' : 'Buyer rating';
    void addProductReview(product.id, {
      userId: currentUser.id,
      userName: currentUser.name,
      rating: ratingValue,
      title: nextTitle,
      content: feedbackText || `Rated ${ratingValue}/5 stars.`,
      verified: true,
      purchaseVerified: true,
      images: [],
    });

    if (feedbackText) {
      addMessage({
        id: `message_rating_${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        recipientId: ratingOrder.farmerId,
        recipientName: ratingOrder.farmerName,
        content: `Rating feedback for order #${ratingOrder.id} (${ratingOrder.productName}): ${ratingValue}/5 stars. ${feedbackText}`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    addNotification({
      id: `notification_rating_${Date.now()}`,
      userId: ratingOrder.farmerId,
      type: 'update',
      title: 'New buyer rating received',
      message: `${currentUser.name} rated ${ratingOrder.productName} ${ratingValue}/5.${feedbackText ? ' Feedback shared in messages.' : ''}`,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: '/ratings',
    });

    setRatingOrder(null);
    setRatingValue(0);
    setRatingFeedback('');
    setRatingError('');
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="animate-fade-in-scale">
        <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
          {isFarmer ? 'Orders Received' : 'My Orders'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isFarmer
            ? 'Review orders from buyers and update their status in real time.'
            : 'Track your purchases and watch order progress update live.'}
        </p>
      </div>

      {orderSuccessMessage && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription>{orderSuccessMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-6">
        {[
          { label: 'Pending', value: statusCounts.pending, icon: '⏱️', textColor: 'text-amber-600' },
          { label: 'Accepted', value: statusCounts.accepted, icon: '✅', textColor: 'text-blue-600' },
          { label: 'Delivered', value: statusCounts.delivered, icon: '📦', textColor: 'text-green-600' },
          { label: 'Cancelled', value: statusCounts.cancelled, icon: '❌', textColor: 'text-red-600' },
          { label: 'Total Orders', value: statusCounts.all, icon: '📊', textColor: 'text-purple-600' },
        ].map((stat, index) => (
          <Card key={stat.label} className="card-hover border border-gray-200 shadow-sm bg-white" style={{ animationDelay: `${index * 50}ms` }}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900 md:text-4xl">{stat.value}</p>
                  <p className={`mt-2 text-sm font-medium ${stat.textColor}`}>{stat.label}</p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all" className="w-full" style={{ animationDelay: '200ms' }}>
        <TabsList className="grid w-full grid-cols-3 bg-gray-50 sm:grid-cols-5">
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({statusCounts.pending})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({statusCounts.accepted})</TabsTrigger>
          <TabsTrigger value="delivered">Delivered ({statusCounts.delivered})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({statusCounts.cancelled})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredOrders('all').map((order, index) => {
            const config = statusConfig[order.status];
            return (
              <Card key={order.id} className="card-hover border-0 shadow-medium transition-all" style={{ animationDelay: `${index * 30}ms` }}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{order.id}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {isFarmer ? `Buyer: ${order.buyerName}` : `Seller: ${order.farmerName}`}
                      </p>
                    </div>
                    <Badge className={`${config.color} flex w-fit items-center gap-1 border`}>
                      {config.icon}
                      <span>{config.label}</span>
                    </Badge>
                  </div>

                  <div className="mb-4 rounded-lg bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-900">{order.productName}</p>
                    <p className="text-sm text-gray-600">Qty: {order.quantity}</p>
                    <p className="text-sm text-gray-600">Method: {formatDeliveryMethod(order.deliveryOption)}</p>
                    <p className="text-sm text-gray-600">Delivery Status: {formatDeliveryStatus(order.deliveryStatus)}</p>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-4 border-b pb-4">
                    <div>
                      <p className="text-xs text-gray-600">Order Date</p>
                      <p className="font-medium text-gray-900">{order.orderDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Est. Delivery</p>
                      <p className="font-medium text-gray-900">{order.deliveryDate ?? 'Pending'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total Amount</p>
                      <p className="text-lg font-bold text-gray-900">₹{order.totalPrice}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Status</p>
                      <p className="font-medium text-gray-900 capitalize">{order.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Delivery Method</p>
                      <p className="font-medium text-gray-900">{formatDeliveryMethod(order.deliveryOption)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Delivery Status</p>
                      <p className="font-medium text-gray-900">{formatDeliveryStatus(order.deliveryStatus)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={() => handleViewDetails(order)} className="flex-1 gap-2">
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                    {isFarmer && order.status === 'pending' && (
                      <Button variant="outline" onClick={() => handleAcceptOrder(order)} className="flex-1 gap-2">
                        Accept Order
                      </Button>
                    )}
                    {isFarmer && isAcceptedPipelineStatus(order.status) && (
                      <Button
                        variant="outline"
                        onClick={() => handleMarkOutForDelivery(order)}
                        className="flex-1 gap-2"
                        disabled={order.deliveryOption !== 'delivery' || order.deliveryStatus === 'out-for-delivery' || order.deliveryStatus === 'delivered'}
                      >
                        Mark Out for Delivery
                      </Button>
                    )}
                    {isFarmer && isAcceptedPipelineStatus(order.status) && (
                      <Button variant="outline" onClick={() => handleMarkDelivered(order)} className="flex-1 gap-2">
                        {order.deliveryOption === 'pickup' ? 'Mark Picked Up' : 'Mark as Delivered'}
                      </Button>
                    )}
                    {isFarmer && order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Button variant="destructive" size="sm" onClick={() => handleRejectOrder(order)} className="gap-2">
                        Reject Order
                      </Button>
                    )}
                    {!isFarmer && (
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleOpenDeliveryTracking(order)}>
                        <Truck className="h-4 w-4" />
                        Track Delivery
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => handleOpenOrderChat(order)}>
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => handleViewInvoice(order)}>
                      <Download className="h-4 w-4" />
                      Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {filteredOrders('pending').length > 0 ? (
            filteredOrders('pending').map((order) => (
              <Card key={order.id}>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{order.id}</p>
                      <p className="text-sm text-gray-600">{isFarmer ? `Buyer: ${order.buyerName}` : `Seller: ${order.farmerName}`}</p>
                    </div>
                    <Badge className="gap-1 border border-yellow-300 bg-yellow-100 text-yellow-800">
                      <Clock className="h-4 w-4" />
                      Pending
                    </Badge>
                  </div>
                  <p className="mb-3 text-sm text-gray-600">{order.productName} · Qty {order.quantity}</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-bold text-gray-900">₹{order.totalPrice}</p>
                    <div className="flex gap-2">
                      <Button onClick={() => handleViewDetails(order)} className="gap-2">
                        View Details
                      </Button>
                      {isBuyer && (
                        <Button variant="outline" onClick={() => handleOpenRatingDialog(order)} className="gap-2">
                          <Star className="h-4 w-4" />
                          Rate Farmer
                        </Button>
                      )}
                      {!isFarmer && (
                        <Button variant="outline" onClick={() => handleOpenDeliveryTracking(order)} className="gap-2">
                          <Truck className="h-4 w-4" />
                          Track Delivery
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => handleOpenOrderChat(order)} className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>
                      <Button variant="outline" onClick={() => handleViewInvoice(order)} className="gap-2">
                        <Download className="h-4 w-4" />
                        Invoice
                      </Button>
                      {isFarmer && (
                        <Button variant="outline" onClick={() => handleAcceptOrder(order)} className="gap-2">
                          Accept Order
                        </Button>
                      )}
                      {isFarmer && (
                        <Button variant="destructive" onClick={() => handleRejectOrder(order)} className="gap-2">
                          Reject Order
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-600">No pending orders</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          {filteredOrders('accepted').length > 0 ? (
            filteredOrders('accepted').map((order) => (
              <Card key={order.id}>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{order.id}</p>
                      <p className="text-sm text-gray-600">{isFarmer ? `Buyer: ${order.buyerName}` : `Seller: ${order.farmerName}`}</p>
                    </div>
                    <Badge className="gap-1 border border-blue-300 bg-blue-100 text-blue-800">
                      <Package className="h-4 w-4" />
                      Accepted
                    </Badge>
                  </div>
                  <p className="mb-3 text-sm text-gray-600">
                    {order.productName} · {formatDeliveryMethod(order.deliveryOption)} · {formatDeliveryStatus(order.deliveryStatus)}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-bold text-gray-900">₹{order.totalPrice}</p>
                    <div className="flex gap-2">
                      <Button onClick={() => handleViewDetails(order)} className="gap-2">
                        View Details
                      </Button>
                      {!isFarmer && (
                        <Button variant="outline" onClick={() => handleOpenDeliveryTracking(order)} className="gap-2">
                          <Truck className="h-4 w-4" />
                          Track Delivery
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => handleOpenOrderChat(order)} className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>
                      <Button variant="outline" onClick={() => handleViewInvoice(order)} className="gap-2">
                        <Download className="h-4 w-4" />
                        Invoice
                      </Button>
                      {isFarmer && (
                        <Button
                          variant="outline"
                          onClick={() => handleMarkOutForDelivery(order)}
                          className="gap-2"
                          disabled={order.deliveryOption !== 'delivery' || order.deliveryStatus === 'out-for-delivery' || order.deliveryStatus === 'delivered'}
                        >
                          Mark Out for Delivery
                        </Button>
                      )}
                      {isFarmer && (
                        <Button variant="outline" onClick={() => handleMarkDelivered(order)} className="gap-2">
                          {order.deliveryOption === 'pickup' ? 'Mark Picked Up' : 'Mark Delivered'}
                        </Button>
                      )}
                      {isFarmer && (
                        <Button variant="destructive" onClick={() => handleRejectOrder(order)} className="gap-2">
                          Reject Order
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-600">No accepted orders</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="delivered" className="space-y-4">
          {filteredOrders('delivered').length > 0 ? (
            filteredOrders('delivered').map((order) => (
              <Card key={order.id}>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{order.id}</p>
                      <p className="text-sm text-gray-600">{isFarmer ? `Buyer: ${order.buyerName}` : `Seller: ${order.farmerName}`}</p>
                    </div>
                    <Badge className="gap-1 border border-green-300 bg-green-100 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      Delivered
                    </Badge>
                  </div>
                  <p className="mb-3 text-sm text-gray-600">{order.productName} · Delivered on {order.deliveryDate ?? order.orderDate}</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-bold text-gray-900">₹{order.totalPrice}</p>
                    <div className="flex gap-2">
                      <Button onClick={() => handleViewDetails(order)} className="gap-2">
                        View Details
                      </Button>
                      {!isFarmer && (
                        <Button variant="outline" onClick={() => handleOpenDeliveryTracking(order)} className="gap-2">
                          <Truck className="h-4 w-4" />
                          Track Delivery
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => handleOpenOrderChat(order)} className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>
                      <Button variant="outline" onClick={() => handleViewInvoice(order)} className="gap-2">
                        <Download className="h-4 w-4" />
                        Invoice
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-600">No delivered orders</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {filteredOrders('cancelled').length > 0 ? (
            filteredOrders('cancelled').map((order) => (
              <Card key={order.id}>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{order.id}</p>
                      <p className="text-sm text-gray-600">{isFarmer ? `Buyer: ${order.buyerName}` : `Seller: ${order.farmerName}`}</p>
                    </div>
                    <Badge className="gap-1 border border-red-300 bg-red-100 text-red-800">
                      <AlertCircle className="h-4 w-4" />
                      Cancelled
                    </Badge>
                  </div>
                  <p className="mb-3 text-sm text-gray-600">{order.productName} · Qty {order.quantity}</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-bold text-gray-900">₹{order.totalPrice}</p>
                    <div className="flex gap-2">
                      <Button onClick={() => handleViewDetails(order)} className="gap-2">
                        View Details
                      </Button>
                      {!isFarmer && (
                        <Button variant="outline" onClick={() => handleOpenDeliveryTracking(order)} className="gap-2">
                          <Truck className="h-4 w-4" />
                          Track Delivery
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => handleOpenOrderChat(order)} className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>
                      <Button variant="outline" onClick={() => handleViewInvoice(order)} className="gap-2">
                        <Download className="h-4 w-4" />
                        Invoice
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-600">No cancelled orders</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showOrderDetail} onOpenChange={(open) => !open && handleCloseOrderDetail()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Live details from shared state</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <p><span className="font-medium">Order:</span> {selectedOrder.id}</p>
                <p><span className="font-medium">Product:</span> {selectedOrder.productName}</p>
                <p><span className="font-medium">Buyer:</span> {selectedOrder.buyerName}</p>
                <p><span className="font-medium">Farmer:</span> {selectedOrder.farmerName}</p>
                <p><span className="font-medium">Status:</span> {selectedOrder.status}</p>
                <p><span className="font-medium">Delivery Method:</span> {formatDeliveryMethod(selectedOrder.deliveryOption)}</p>
                <p><span className="font-medium">Delivery Status:</span> {formatDeliveryStatus(selectedOrder.deliveryStatus)}</p>
                <p><span className="font-medium">Total:</span> ₹{selectedOrder.totalPrice}</p>
                {selectedOrder.paidAmount !== undefined && (
                  <p><span className="font-medium">Paid Amount:</span> ₹{selectedOrder.paidAmount}</p>
                )}
                {selectedOrder.paymentReference && (
                  <p><span className="font-medium">Payment Ref:</span> {selectedOrder.paymentReference}</p>
                )}
              </div>
              {!isFarmer && (
                <Button variant="outline" className="w-full" onClick={() => handleOpenDeliveryTracking(selectedOrder)}>
                  <Truck className="mr-2 h-4 w-4" />
                  Open Delivery Tracking
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => handleViewInvoice(selectedOrder)}>
                <Download className="mr-2 h-4 w-4" />
                View Invoice
              </Button>
              {isBuyer && selectedOrder.status === 'delivered' && (
                <Button variant="outline" className="w-full" onClick={() => handleOpenRatingDialog(selectedOrder)}>
                  <Star className="mr-2 h-4 w-4" />
                  Rate Farmer
                </Button>
              )}
              {isFarmer && selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {selectedOrder.status === 'pending' && (
                    <Button className="w-full" onClick={() => {
                      handleAcceptOrder(selectedOrder);
                      handleCloseOrderDetail();
                    }}>
                      Accept Order
                    </Button>
                  )}
                  {isAcceptedPipelineStatus(selectedOrder.status) && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        handleMarkOutForDelivery(selectedOrder);
                        handleCloseOrderDetail();
                      }}
                      disabled={selectedOrder.deliveryOption !== 'delivery' || selectedOrder.deliveryStatus === 'out-for-delivery' || selectedOrder.deliveryStatus === 'delivered'}
                    >
                      Mark Out for Delivery
                    </Button>
                  )}
                  {isAcceptedPipelineStatus(selectedOrder.status) && (
                    <Button className="w-full" onClick={() => {
                      handleMarkDelivered(selectedOrder);
                      handleCloseOrderDetail();
                    }}>
                      {selectedOrder.deliveryOption === 'pickup' ? 'Mark Picked Up' : 'Mark as Delivered'}
                    </Button>
                  )}
                  {selectedOrder.status !== 'cancelled' && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        handleRejectOrder(selectedOrder);
                        handleCloseOrderDetail();
                      }}
                    >
                      Reject Order
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(ratingOrder)} onOpenChange={(open) => !open && setRatingOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Farmer</DialogTitle>
            <DialogDescription>
              Share rating and feedback for {ratingOrder?.productName} from {ratingOrder?.farmerName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Your Rating</Label>
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, index) => {
                  const starNumber = index + 1;
                  const isActive = ratingValue >= starNumber;
                  return (
                    <button
                      key={starNumber}
                      type="button"
                      onClick={() => {
                        setRatingValue(starNumber);
                        setRatingError('');
                      }}
                      className="text-left"
                    >
                      <Star className={`h-6 w-6 ${isActive ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="rating-feedback">Feedback</Label>
              <textarea
                id="rating-feedback"
                rows={4}
                value={ratingFeedback}
                onChange={(event) => setRatingFeedback(event.target.value)}
                placeholder="Tell the farmer what went well and what can improve"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none"
              />
            </div>

            {ratingError && (
              <Alert variant="destructive">
                <AlertDescription>{ratingError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSubmitRating}>
                Submit Rating
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setRatingOrder(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <InvoiceModal
        open={Boolean(selectedInvoiceOrder)}
        onOpenChange={(open) => !open && setSelectedInvoiceOrder(null)}
        order={selectedInvoiceOrder}
        buyer={selectedInvoiceBuyer}
        farmer={selectedInvoiceFarmer}
        product={selectedInvoiceProduct}
      />
    </div>
  );
};

export default OrdersPage;
