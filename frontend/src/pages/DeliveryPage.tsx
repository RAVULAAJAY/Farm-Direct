import React, { useEffect, useMemo, useState } from 'react';
import DeliveryStatus, { DeliveryStatusData, DeliveryStatus as DeliveryStatusType } from '@/components/Delivery/DeliveryStatus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';
import { Order } from '@/lib/data';

const DeliveryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('history');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isFarmer = currentUser?.role === 'farmer';
  const { orders, users } = useGlobalState();
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  useEffect(() => {
    if (isFarmer && activeTab === 'status') {
      setActiveTab('history');
    }
  }, [activeTab, isFarmer]);

  const userOrders = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    if (currentUser.role === 'farmer') {
      return orders.filter((order) => order.farmerId === currentUser.id);
    }

    return orders.filter((order) => order.buyerId === currentUser.id);
  }, [orders, currentUser]);

  const activeOrders = useMemo(
    () => userOrders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled'),
    [userOrders]
  );

  const deliveredOrders = useMemo(
    () => userOrders.filter((order) => order.status === 'delivered'),
    [userOrders]
  );

  const cancelledOrders = useMemo(
    () => userOrders.filter((order) => order.status === 'cancelled'),
    [userOrders]
  );

  useEffect(() => {
    const deepLinkedOrderId = searchParams.get('orderId');
    if (!deepLinkedOrderId) {
      return;
    }

    if (!userOrders.some((order) => order.id === deepLinkedOrderId)) {
      return;
    }

    setSelectedOrderId(deepLinkedOrderId);
    setActiveTab('status');

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('orderId');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, userOrders]);

  useEffect(() => {
    if (selectedOrderId && userOrders.some((order) => order.id === selectedOrderId)) {
      return;
    }

    if (activeOrders.length > 0) {
      setSelectedOrderId(activeOrders[0].id);
      return;
    }

    if (userOrders.length > 0) {
      setSelectedOrderId(userOrders[0].id);
      return;
    }

    setSelectedOrderId('');
  }, [activeOrders, selectedOrderId, userOrders]);

  const selectedOrder = useMemo(
    () => userOrders.find((order) => order.id === selectedOrderId) ?? null,
    [selectedOrderId, userOrders]
  );

  const mapOrderToDeliveryStatus = (order: Order): DeliveryStatusType => {
    if (order.deliveryStatus === 'delivered') {
      return 'delivered';
    }

    if (order.deliveryStatus === 'out-for-delivery') {
      return 'on-the-way';
    }

    if (order.deliveryOption === 'delivery' && (order.status === 'accepted' || order.status === 'confirmed')) {
      return 'arriving-soon';
    }

    return 'confirmed';
  };

  const getDeliveryData = (order: Order): DeliveryStatusData => {
    const farmer = users.find((user) => user.id === order.farmerId);
    const status = mapOrderToDeliveryStatus(order);
    const method = order.deliveryOption === 'pickup' ? 'self-pickup' : 'farmer-delivery';
    const destination = order.deliveryOption === 'pickup'
      ? (order.pickupLocation || farmer?.location || 'Farm pickup point')
      : (order.deliveryAddress || currentUser?.location || 'Buyer address');

    return {
      orderId: order.id,
      status,
      method,
      farmerName: order.farmerName,
      farmerPhone: farmer?.phone || 'Not available',
      estimatedTime: order.deliveryDate,
      location: {
        current: status === 'on-the-way' ? farmer?.location : undefined,
        destination,
      },
      timeline: {
        confirmed: { time: order.orderDate, completed: true },
        processing: {
          time: order.deliveryOption === 'pickup' ? 'Preparing pickup order' : 'Preparing delivery order',
          completed: ['accepted', 'confirmed', 'shipped', 'delivered'].includes(order.status),
        },
        on_the_way: {
          time: order.deliveryDate ?? 'Pending',
          completed: order.deliveryStatus === 'out-for-delivery' || order.deliveryStatus === 'delivered',
        },
        arriving_soon: {
          time: order.deliveryDate ?? 'Pending',
          completed: order.deliveryStatus === 'delivered',
        },
        delivered: {
          time: order.deliveryDate ?? 'Pending',
          completed: order.deliveryStatus === 'delivered',
        },
      },
    };
  };

  const handleContactFarmer = () => {
    alert('Calling farmer...');
  };

  const handleOrderIdClick = (orderId: string) => {
    const query = new URLSearchParams({ orderId });
    navigate(`/orders?${query.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Management</h1>
          <p className="text-gray-600">Track your orders</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className={`grid w-full ${isFarmer ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {!isFarmer && <TabsTrigger value="status">Track Order</TabsTrigger>}
            <TabsTrigger value="history">Delivery History</TabsTrigger>
          </TabsList>

          {/* Track Order Tab */}
          {!isFarmer && (
            <TabsContent value="status" className="space-y-4">
              {selectedOrder ? (
                <Card className="p-6">
                  <DeliveryStatus
                    delivery={getDeliveryData(selectedOrder)}
                    onContactFarmer={handleContactFarmer}
                    onOrderIdClick={handleOrderIdClick}
                  />
                </Card>
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-gray-600 mb-4">No order selected for tracking</p>
                  <Button onClick={() => setActiveTab('history')} className="bg-blue-600 hover:bg-blue-700">
                    View History
                  </Button>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Delivery History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="space-y-4">
              {activeOrders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Orders</h3>
                  <div className="space-y-4">
                    {activeOrders.map((order) => (
                      <Card key={order.id} className="p-4">
                        <DeliveryStatus
                          delivery={getDeliveryData(order)}
                          onContactFarmer={handleContactFarmer}
                          onOrderIdClick={handleOrderIdClick}
                        />
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {deliveredOrders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Delivered</h3>
                  <div className="space-y-4">
                    {deliveredOrders.map((order) => (
                      <Card key={order.id} className="p-4">
                        <DeliveryStatus
                          delivery={getDeliveryData(order)}
                          onContactFarmer={handleContactFarmer}
                          onOrderIdClick={handleOrderIdClick}
                        />
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {cancelledOrders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelled</h3>
                  <div className="space-y-2">
                    {cancelledOrders.map((order) => (
                      <Card key={order.id} className="p-4">
                        <p className="font-medium text-gray-900">{order.id} - {order.productName}</p>
                        <p className="text-sm text-gray-600">{order.deliveryOption === 'pickup' ? 'Pickup' : 'Delivery'} · Cancelled</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {userOrders.length === 0 && (
                <Card className="p-8 text-center text-gray-600">
                  No delivery history yet.
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DeliveryPage;
