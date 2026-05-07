import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Truck, AlertCircle } from 'lucide-react';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  image: string;
}

export interface OrderSummary {
  items: OrderItem[];
  subtotal: number;
  deliveryCharges: number;
  taxes: number;
  discount?: number;
  total: number;
  deliveryAddress: string;
  deliveryDate: string;
  sellerName: string;
  sellerLocation: string;
}

interface ProductSummaryProps {
  order: OrderSummary;
  showDeliveryInfo?: boolean;
}

const ProductSummary: React.FC<ProductSummaryProps> = ({
  order,
  showDeliveryInfo = true
}) => {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm">Order Items</h4>
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between pb-3 border-b last:border-b-0">
              <div className="flex gap-3 flex-1">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-600">
                    {item.quantity} {item.unit} × ₹{item.price}/{item.unit}
                  </p>
                </div>
              </div>
              <p className="font-semibold text-gray-900">
                ₹{item.price * item.quantity}
              </p>
            </div>
          ))}
        </div>

        <Separator />

        {/* Seller Info */}
        {showDeliveryInfo && (
          <>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 text-sm">Seller</h4>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="font-medium text-gray-900 text-sm">{order.sellerName}</p>
                <p className="text-xs text-gray-600">{order.sellerLocation}</p>
              </div>
            </div>

            <Separator />

            {/* Delivery Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-gray-600" />
                <h4 className="font-semibold text-gray-900 text-sm">Delivery Details</h4>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600">Address</p>
                <p className="font-medium text-gray-900 text-sm mt-1">
                  {order.deliveryAddress}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Est. Delivery: {order.deliveryDate}
                </p>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>

          {order.discount && order.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-medium">
              <span>Discount</span>
              <span>-₹{order.discount}</span>
            </div>
          )}

          <div className="flex justify-between text-sm text-gray-600">
            <span>Taxes (5% GST)</span>
            <span>₹{order.taxes}</span>
          </div>

          <div className="flex justify-between text-sm text-gray-600">
            <span>Delivery Charges</span>
            <span className={order.deliveryCharges === 0 ? 'text-green-600 font-medium' : ''}>
              {order.deliveryCharges === 0 ? 'FREE' : `₹${order.deliveryCharges}`}
            </span>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center pt-2 bg-gray-50 p-3 rounded-lg">
            <span className="font-semibold text-gray-900">Total Amount</span>
            <span className="text-2xl font-bold text-green-600">₹{order.total}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-xs text-yellow-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Your order will be confirmed once payment is completed. Seller will provide delivery updates via SMS.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductSummary;
