import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, Smartphone, Truck, Wallet, AlertCircle, QrCode } from 'lucide-react';
import { hasBuyerPaymentDetails, useAuth } from '@/context/AuthContext';
import { CheckoutPaymentMethod, useGlobalState } from '@/context/GlobalStateContext';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { cartItems, products, users, checkoutCart } = useGlobalState();

  const [deliveryAddress, setDeliveryAddress] = useState(currentUser?.location ?? '');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone ?? '');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('upi');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const detailedItems = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = products.find((entry) => entry.id === item.productId);
          if (!product) {
            return null;
          }

          const availableStock = product.stock ?? product.quantity;
          const quantity = Math.max(1, Math.min(item.quantity, Math.max(1, availableStock)));
          return {
            product,
            quantity,
            total: product.price * quantity,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [cartItems, products]
  );

  const subtotal = detailedItems.reduce((sum, entry) => sum + entry.total, 0);

  const upiPaymentDetails = useMemo(
    () =>
      detailedItems.map(({ product, quantity, total }) => {
        const farmerUser = users.find((entry) => entry.id === product.farmerId && entry.role === 'farmer');

        return {
          product,
          quantity,
          total,
          farmerName: farmerUser?.name ?? product.farmerName,
          farmerUpi: farmerUser?.paymentDetails?.ifscOrUpi ?? '',
          qrCodeDataUrl: farmerUser?.paymentDetails?.upiQrCodeDataUrl ?? '',
          qrCodeFileName: farmerUser?.paymentDetails?.upiQrCodeFileName ?? '',
        };
      }),
    [detailedItems, users]
  );

  const paymentOptions: Array<{ value: CheckoutPaymentMethod; label: string; icon: React.ReactNode }> = [
    { value: 'upi', label: 'UPI', icon: <Smartphone className="h-4 w-4" /> },
    { value: 'card', label: 'Card', icon: <CreditCard className="h-4 w-4" /> },
    { value: 'cod', label: 'Cash on Delivery', icon: <Wallet className="h-4 w-4" /> },
  ];

  const handleConfirmOrder = () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentUser || currentUser.role !== 'buyer') {
      setErrorMessage('Only buyer accounts can access checkout.');
      return;
    }

    if (!hasBuyerPaymentDetails(currentUser)) {
      const next = encodeURIComponent('/checkout');
      navigate(`/buyer/add-payment?warning=payment-required&next=${next}`);
      return;
    }

    const result = checkoutCart({
      deliveryAddress,
      contactPhone,
      paymentMethod,
    });

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    setSuccessMessage('Order confirmed successfully. Redirecting to your orders...');
    window.setTimeout(() => navigate('/orders'), 1400);
  };

  if (detailedItems.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <Card>
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <Truck className="h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-semibold text-gray-900">No items available for checkout</p>
              <p className="text-sm text-gray-600">Add products to your cart before proceeding.</p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => navigate('/browse')}>
              Browse Listings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="mt-2 text-gray-600">Enter delivery details and choose a payment method to place your order.</p>
      </div>

      {errorMessage && (
        <Alert className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="delivery-address">Delivery Address</Label>
                <textarea
                  id="delivery-address"
                  rows={4}
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none"
                  placeholder="House no, street, area, city, state, pincode"
                />
              </div>

              <div>
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="Enter contact number"
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {paymentOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={paymentMethod === option.value ? 'default' : 'outline'}
                  className="justify-start gap-2"
                  onClick={() => setPaymentMethod(option.value)}
                >
                  {option.icon}
                  {option.label}
                </Button>
              ))}

              {paymentMethod === 'upi' && (
                <div className="mt-4 space-y-4 sm:col-span-3">
                  <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                    <QrCode className="h-4 w-4" />
                    <AlertDescription>
                      Scan the correct farmer QR code shown for each product below. If your cart has items from multiple farmers, each product displays its own QR.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {upiPaymentDetails.map(({ product, farmerName, farmerUpi, qrCodeDataUrl, qrCodeFileName, quantity, total }) => (
                      <div key={product.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-gray-900">{product.name}</p>
                              <Badge variant="secondary">{quantity} {product.unit}</Badge>
                            </div>
                            <p className="text-sm text-gray-600">Farmer: {farmerName}</p>
                            <p className="text-sm text-gray-700">Amount: ₹{total.toFixed(2)}</p>
                            <p className="text-sm text-gray-700">
                              UPI ID: {farmerUpi || 'Not added'}
                            </p>
                          </div>

                          <div className="flex flex-col items-center gap-2 rounded-lg border bg-gray-50 p-3 lg:min-w-56">
                            {qrCodeDataUrl ? (
                              <>
                                <img
                                  src={qrCodeDataUrl}
                                  alt={`${farmerName} UPI QR code for ${product.name}`}
                                  className="h-48 w-48 rounded-md border bg-white object-contain"
                                />
                                <p className="text-center text-xs font-medium text-gray-900">
                                  {qrCodeFileName || `${farmerName} QR`}
                                </p>
                              </>
                            ) : (
                              <div className="flex h-48 w-48 items-center justify-center rounded-md border border-dashed bg-white text-center text-sm text-gray-500">
                                No QR code uploaded for this farmer yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-56 space-y-2 overflow-auto pr-1">
                {detailedItems.map(({ product, quantity, total }) => (
                  <div key={product.id} className="rounded-md border p-2">
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-600">{quantity} {product.unit} • ₹{total.toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-green-700">₹{subtotal.toFixed(2)}</span>
              </div>

              <Alert className="border-blue-200 bg-blue-50 text-blue-800">
                <Truck className="h-4 w-4" />
                <AlertDescription>Secure checkout is enabled. Your order confirmation will appear immediately after payment authorization.</AlertDescription>
              </Alert>

              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleConfirmOrder}>
                Confirm Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
