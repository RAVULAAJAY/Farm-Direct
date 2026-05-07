import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  Phone,
  Clock
} from 'lucide-react';
import { Separator } from "@/components/ui/separator";

export type FailureReason = 
  | 'insufficient_funds'
  | 'card_declined'
  | 'invalid_otp'
  | 'timeout'
  | 'network_error'
  | 'unknown';

const failureReasons: Record<FailureReason, { title: string; description: string; suggestion: string }> = {
  insufficient_funds: {
    title: 'Insufficient Funds',
    description: 'Your account does not have sufficient balance for this transaction.',
    suggestion: 'Please add funds to your account or try another payment method.'
  },
  card_declined: {
    title: 'Card Declined',
    description: 'Your card has been declined by the bank.',
    suggestion: 'Please check your card details or contact your bank.'
  },
  invalid_otp: {
    title: 'Invalid OTP',
    description: 'The OTP you entered is incorrect or has expired.',
    suggestion: 'Please request for a new OTP and try again.'
  },
  timeout: {
    title: 'Payment Timeout',
    description: 'The payment request has timed out.',
    suggestion: 'Please check your internet connection and try again.'
  },
  network_error: {
    title: 'Network Error',
    description: 'Unable to process payment due to network connectivity issues.',
    suggestion: 'Please ensure you have a stable internet connection and try again.'
  },
  unknown: {
    title: 'Payment Failed',
    description: 'An unexpected error occurred while processing your payment.',
    suggestion: 'Please try again later or contact customer support.'
  }
};

interface PaymentFailureScreenProps {
  reason?: FailureReason;
  orderId?: string;
  amount: number;
  onRetry?: () => void;
  onChangeMethod?: () => void;
  onGoBack?: () => void;
  onContactSupport?: () => void;
}

const PaymentFailureScreen: React.FC<PaymentFailureScreenProps> = ({
  reason = 'unknown',
  orderId,
  amount,
  onRetry,
  onChangeMethod,
  onGoBack,
  onContactSupport
}) => {
  const failureInfo = failureReasons[reason];

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Failure Animation */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse">
              <div className="h-24 w-24 bg-red-200 rounded-full opacity-50" />
            </div>
            <div className="relative flex items-center justify-center h-24 w-24 bg-red-100 rounded-full">
              <XCircle className="h-16 w-16 text-red-600" />
            </div>
          </div>
        </div>

        {/* Failure Message */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Payment Failed
          </h1>
          <p className="text-gray-600">
            Unfortunately, your payment could not be processed
          </p>
        </div>

        {/* Error Alert */}
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <p className="font-semibold">{failureInfo.title}</p>
            <p className="text-sm mt-1">{failureInfo.description}</p>
          </AlertDescription>
        </Alert>

        {/* Error Details Card */}
        <Card className="border-red-200">
          <CardHeader className="bg-red-50 border-b">
            <CardTitle className="text-lg">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {/* Order Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">
                  Amount
                </p>
                <p className="text-lg font-bold text-gray-900 mt-1">₹{amount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">
                  Status
                </p>
                <p className="text-lg font-bold text-red-600 mt-1">Failed</p>
              </div>
            </div>

            {orderId && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">
                    Reference ID
                  </p>
                  <p className="text-sm font-mono text-gray-900 mt-1">{orderId}</p>
                </div>
              </>
            )}

            <Separator />

            {/* What to Do */}
            <div className="space-y-3">
              <p className="text-xs text-gray-600 uppercase font-semibold">
                What You Can Do
              </p>
              <div className="space-y-2">
                <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <RefreshCw className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Try Again
                    </p>
                    <p className="text-xs text-gray-600">
                      {failureInfo.suggestion}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Try Different Method
                    </p>
                    <p className="text-xs text-gray-600">
                      Select another payment method from our available options
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Phone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Contact Support
                    </p>
                    <p className="text-xs text-gray-600">
                      Reach out to our support team for assistance
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Note */}
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <p className="font-semibold text-sm">
              No amount has been deducted from your account
            </p>
            <p className="text-xs mt-1">
              Your cart items are saved. You can retry payment anytime.
            </p>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onRetry}
            className="w-full bg-green-600 hover:bg-green-700 gap-2 py-6 text-base"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>

          <Button
            onClick={onChangeMethod}
            variant="outline"
            className="w-full gap-2"
          >
            Try Different Payment Method
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onContactSupport}
              variant="outline"
              className="gap-2"
            >
              <Phone className="h-4 w-4" />
              Support
            </Button>
            <Button
              onClick={onGoBack}
              variant="outline"
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>

        {/* FAQ */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4">
            <details className="space-y-2 text-sm cursor-pointer">
              <summary className="font-semibold text-gray-900 hover:text-gray-700">
                Why did my payment fail?
              </summary>
              <div className="text-gray-600 mt-2 space-y-1 text-xs">
                <p>
                  Payments can fail due to various reasons including insufficient funds, incorrect card details, network issues, or bank restrictions. No amount will be charged if payment fails.
                </p>
              </div>
            </details>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentFailureScreen;
