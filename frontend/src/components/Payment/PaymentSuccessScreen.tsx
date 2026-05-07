import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Download,
  Share2,
  Home,
  Package,
  Truck
} from 'lucide-react';
import { Separator } from "@/components/ui/separator";

interface PaymentSuccessScreenProps {
  orderId: string;
  totalAmount: number;
  sellerName: string;
  deliveryDate: string;
  deliveryAddress: string;
  paymentMethod: string;
  itemsCount: number;
  onDownloadInvoice?: () => void;
  onShareOrder?: () => void;
  onBackHome?: () => void;
  onViewOrder?: () => void;
}

const PaymentSuccessScreen: React.FC<PaymentSuccessScreenProps> = ({
  orderId,
  totalAmount,
  sellerName,
  deliveryDate,
  deliveryAddress,
  paymentMethod,
  itemsCount,
  onDownloadInvoice,
  onShareOrder,
  onBackHome,
  onViewOrder
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success Animation */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse">
              <div className="h-24 w-24 bg-green-200 rounded-full opacity-50" />
            </div>
            <div className="relative flex items-center justify-center h-24 w-24 bg-green-100 rounded-full">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Your order has been confirmed and seller will start preparing it
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="border-2 border-green-200 bg-white">
          <CardHeader className="bg-green-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Order Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {/* Order ID and Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">
                  Order ID
                </p>
                <p className="text-lg font-bold text-gray-900 mt-1">{orderId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">
                  Amount Paid
                </p>
                <p className="text-lg font-bold text-green-600 mt-1">₹{totalAmount}</p>
              </div>
            </div>

            <Separator />

            {/* Seller Info */}
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
                From
              </p>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="font-semibold text-gray-900">{sellerName}</p>
                <p className="text-sm text-gray-600 mt-1">
                  📦 {itemsCount} item{itemsCount > 1 ? 's' : ''} ordered
                </p>
              </div>
            </div>

            <Separator />

            {/* Delivery Info */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">
                    Delivery Address
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {deliveryAddress}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">
                  Estimated Delivery
                </p>
                <p className="text-lg font-semibold text-blue-600">{deliveryDate}</p>
                <p className="text-xs text-gray-600 mt-2">
                  You'll receive SMS updates on delivery status
                </p>
              </div>
            </div>

            <Separator />

            {/* Payment Info */}
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold mb-2">
                Payment Method
              </p>
              <Badge variant="secondary" className="text-sm">
                {paymentMethod}
              </Badge>
            </div>

            {/* Status Timeline */}
            <div className="space-y-3 pt-2">
              <p className="text-xs text-gray-600 uppercase font-semibold">
                What's Next
              </p>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      ✓
                    </div>
                    <div className="h-6 w-0.5 bg-gray-300 my-1" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Payment Confirmed
                    </p>
                    <p className="text-xs text-gray-600">Just now</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                      2
                    </div>
                    <div className="h-6 w-0.5 bg-gray-300 my-1" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Preparation Started
                    </p>
                    <p className="text-xs text-gray-600">Seller is preparing your order</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm">
                      3
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Out for Delivery
                    </p>
                    <p className="text-xs text-gray-600">Your package is on the way</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onDownloadInvoice}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Invoice
            </Button>
            <Button
              onClick={onShareOrder}
              variant="outline"
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onViewOrder}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <Package className="h-4 w-4" />
              Track Order
            </Button>
            <Button
              onClick={onBackHome}
              variant="outline"
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
          </div>
        </div>

        {/* Contact Support */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 text-center">
              Have questions about your order?{' '}
              <button className="text-green-600 hover:text-green-700 font-semibold">
                Contact Seller
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessScreen;
