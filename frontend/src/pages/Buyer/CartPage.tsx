import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Minus, Plus, ShoppingCart, Trash2, ArrowRight, AlertCircle } from 'lucide-react';
import { useGlobalState } from '@/context/GlobalStateContext';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    products,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
  } = useGlobalState();

  const detailedItems = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = products.find((entry) => entry.id === item.productId);
          if (!product) {
            return null;
          }

          const availableStock = product.stock ?? product.quantity;
          const safeQuantity = Math.max(1, Math.min(item.quantity, Math.max(1, availableStock)));

          return {
            item,
            product,
            availableStock,
            safeQuantity,
            total: product.price * safeQuantity,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [cartItems, products]
  );

  const itemCount = detailedItems.reduce((sum, entry) => sum + entry.safeQuantity, 0);
  const subtotal = detailedItems.reduce((sum, entry) => sum + entry.total, 0);

  if (detailedItems.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Cart</h1>
          <p className="mt-2 text-gray-600">No items added yet.</p>
        </div>

        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-semibold text-gray-900">Your cart is empty</p>
              <p className="text-sm text-gray-600">Browse fresh products and add them to continue.</p>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Cart</h1>
          <p className="mt-1 text-gray-600">{itemCount} items ready for checkout</p>
        </div>
        <Button variant="outline" onClick={clearCart} className="gap-2">
          <Trash2 className="h-4 w-4" />
          Clear Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {detailedItems.map(({ item, product, availableStock, safeQuantity, total }) => (
            <Card key={item.productId}>
              <CardContent className="pt-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.farmerName} • {product.location}</p>
                    <p className="mt-1 text-sm font-medium text-green-700">₹{product.price.toFixed(2)} / {product.unit}</p>
                    <p className="text-xs text-gray-500">Available: {availableStock} {product.unit}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-md border">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateCartItemQuantity(item.productId, Math.max(1, safeQuantity - 1))}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center text-sm font-semibold">{safeQuantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateCartItemQuantity(item.productId, Math.min(availableStock, safeQuantity + 1))}
                        aria-label="Increase quantity"
                        disabled={safeQuantity >= availableStock}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button variant="outline" onClick={() => removeFromCart(item.productId)} className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>

                    <p className="w-24 text-right text-lg font-bold text-gray-900">₹{total.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Items</span>
                <span className="font-medium">{itemCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-green-700">₹{subtotal.toFixed(2)}</span>
              </div>

              <Alert className="border-blue-200 bg-blue-50 text-blue-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Delivery details and payment method are collected in checkout.</AlertDescription>
              </Alert>

              <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={() => navigate('/checkout')}>
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
