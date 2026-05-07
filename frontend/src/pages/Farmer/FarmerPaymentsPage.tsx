import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, IndianRupee, PackageCheck, ReceiptText, RefreshCw, Wallet } from 'lucide-react';
import { hasFarmerPaymentDetails, User } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';

interface FarmerPaymentsPageProps {
  user: User;
}

const formatCurrency = (value: number) => `₹${value.toFixed(0)}`;

const formatDate = (value?: string) => {
  if (!value) {
    return 'Pending';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Pending';
  }

  return parsedDate.toLocaleDateString();
};

const FarmerPaymentsPage: React.FC<FarmerPaymentsPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const { orders } = useGlobalState();

  const hasPaymentDetails = hasFarmerPaymentDetails(user);

  const farmerOrders = useMemo(
    () => orders.filter((order) => order.farmerId === user.id),
    [orders, user.id]
  );

  const completedPayments = useMemo(
    () =>
      [...farmerOrders]
        .filter((order) => order.status === 'delivered')
        .sort((a, b) => {
          const aDate = new Date(a.deliveryDate ?? a.orderDate).getTime();
          const bDate = new Date(b.deliveryDate ?? b.orderDate).getTime();
          return bDate - aDate;
        }),
    [farmerOrders]
  );

  const pendingPayments = useMemo(
    () =>
      farmerOrders.filter(
        (order) => order.status !== 'delivered' && order.status !== 'cancelled'
      ),
    [farmerOrders]
  );

  const completedAmount = useMemo(
    () => completedPayments.reduce((sum, order) => sum + order.totalPrice, 0),
    [completedPayments]
  );

  const pendingAmount = useMemo(
    () => pendingPayments.reduce((sum, order) => sum + order.totalPrice, 0),
    [pendingPayments]
  );

  const recentCompletedPayments = completedPayments.slice(0, 5);
  const recentPendingPayments = pendingPayments.slice(0, 5);

  return (
    <div className="space-y-6 pb-8">
      <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-700 to-green-600 text-white">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Payments</h1>
              <p className="mt-2 text-emerald-100">
                Track completed payouts from delivered orders and monitor pending settlements.
              </p>
            </div>
            <Button className="bg-white text-emerald-700 hover:bg-emerald-50 gap-2" onClick={() => navigate('/farmer/payment-setup')}>
              <CreditCard className="h-4 w-4" />
              Update Payment Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {!hasPaymentDetails && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <ReceiptText className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Add bank or UPI details to receive completed order payouts.
            </span>
            <Button size="sm" onClick={() => navigate('/farmer/payment-setup')} className="bg-amber-600 hover:bg-amber-700 text-white">
              Set Up Payment
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Completed Payments</p>
              <PackageCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{completedPayments.length}</p>
            <p className="text-sm text-gray-500 mt-1">Delivered orders</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Completed Amount</p>
              <IndianRupee className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(completedAmount)}</p>
            <p className="text-sm text-gray-500 mt-1">Ready for settlement</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Pending Settlements</p>
              <Wallet className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-amber-600">{formatCurrency(pendingAmount)}</p>
            <p className="text-sm text-gray-500 mt-1">{pendingPayments.length} open orders</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Payment Status</p>
              <RefreshCw className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">
              {hasPaymentDetails ? 'Active payout details' : 'Setup required'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {hasPaymentDetails ? user.paymentDetails?.ifscOrUpi : 'Add bank or UPI details'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Completed Payments</CardTitle>
            <CardDescription>Delivered orders that count toward your payout</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCompletedPayments.length > 0 ? (
              <div className="space-y-3">
                {recentCompletedPayments.map((order) => (
                  <div key={order.id} className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{order.productName}</p>
                        <p className="text-sm text-gray-600">Buyer: {order.buyerName}</p>
                        <p className="text-sm text-gray-600">Delivered: {formatDate(order.deliveryDate ?? order.orderDate)}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-bold text-green-700">{formatCurrency(order.totalPrice)}</p>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Completed</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No delivered orders yet. Completed payments will appear here once orders are marked delivered.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Settlements</CardTitle>
            <CardDescription>Orders that are not delivered yet</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPendingPayments.length > 0 ? (
              <div className="space-y-3">
                {recentPendingPayments.map((order) => (
                  <div key={order.id} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{order.productName}</p>
                        <p className="text-sm text-gray-600">Buyer: {order.buyerName}</p>
                        <p className="text-sm text-gray-600">Order date: {formatDate(order.orderDate)}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-bold text-amber-700">{formatCurrency(order.totalPrice)}</p>
                        <Badge variant="secondary">{order.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No pending settlements. All current orders are already delivered or cancelled.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerPaymentsPage;