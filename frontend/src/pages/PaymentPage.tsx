import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader, ChevronLeft, Lock, ShieldCheck } from 'lucide-react';
import ProductSummary, { OrderSummary } from '@/components/Payment/ProductSummary';
import PaymentOptions, { PaymentMethod } from '@/components/Payment/PaymentOptions';
import PaymentSuccessScreen from '@/components/Payment/PaymentSuccessScreen';
import PaymentFailureScreen from '@/components/Payment/PaymentFailureScreen';

type PaymentStep = 'review' | 'method' | 'processing' | 'success' | 'failure';

interface PaymentPageProps {
  order: OrderSummary;
  onBack?: () => void;
  onSuccess?: (orderId: string) => void;
  onFailure?: (reason: string) => void;
}

const PaymentPage: React.FC<PaymentPageProps> = ({
  order,
  onBack,
  onSuccess,
  onFailure
}) => {
  const [step, setStep] = useState<PaymentStep>('review');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const generateOrderId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
  };

  const handlePayment = async () => {
    if (!agreeTerms) {
      alert('Please agree to terms and conditions');
      return;
    }

    setStep('processing');
    setIsProcessing(true);

    // Simulate payment processing
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 30;
      });
    }, 300);

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    clearInterval(interval);

    // Simulate success/failure (80% success rate)
    const isSuccess = Math.random() > 0.2;

    if (isSuccess) {
      setProcessingProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      setStep('success');
    } else {
      setStep('failure');
    }

    setIsProcessing(false);
  };

  const handleRetry = () => {
    setStep('method');
    setProcessingProgress(0);
  };

  const handleChangeMethod = () => {
    setStep('review');
    setProcessingProgress(0);
  };

  const handleGoBack = () => {
    if (onBack) onBack();
  };

  // Review Step
  if (step === 'review') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <Button
              onClick={handleGoBack}
              variant="ghost"
              size="icon"
              className="text-gray-600"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Order</h1>
              <p className="text-gray-600 text-sm mt-1">
                Step 1 of 2 - Review and confirm your order
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              <ProductSummary order={order} showDeliveryInfo={true} />

              {/* Promo Code */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter promo code"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <Button variant="outline">Apply</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Terms */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <Checkbox
                      id="terms"
                      checked={agreeTerms}
                      onCheckedChange={() => setAgreeTerms(!agreeTerms)}
                      className="mt-1"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                      I agree to the{' '}
                      <Button variant="link" className="p-0 h-auto text-green-600 hover:text-green-700">
                        Terms & Conditions
                      </Button>
                      {' '}and{' '}
                      <Button variant="link" className="p-0 h-auto text-green-600 hover:text-green-700">
                        Privacy Policy
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4 border-2 border-green-200 bg-green-50">
                <CardHeader className="bg-green-100">
                  <CardTitle className="text-base">Order Total</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">₹{order.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span>Discount</span>
                      <span>-₹{order.discount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Taxes</span>
                      <span className="font-medium">₹{order.taxes}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery</span>
                      <span className="font-medium text-green-600">FREE</span>
                    </div>
                  </div>

                  <div className="border-t border-green-300 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₹{order.total}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setStep('method')}
                    disabled={!agreeTerms}
                    className="w-full bg-green-600 hover:bg-green-700 py-6 text-base"
                  >
                    Proceed to Payment
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                    <Lock className="h-3 w-3" />
                    Secure Payment
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Payment Method Step
  if (step === 'method') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <Button
              onClick={() => setStep('review')}
              variant="ghost"
              size="icon"
              className="text-gray-600"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Select Payment Method</h1>
              <p className="text-gray-600 text-sm mt-1">
                Step 2 of 2 - Choose how to pay
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Methods */}
            <div className="lg:col-span-2">
              <PaymentOptions
                selectedMethod={selectedMethod}
                onSelectMethod={setSelectedMethod}
              />
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4 border-green-200">
                <CardContent className="space-y-4 pt-6">
                  <div className="text-center">
                    <p className="text-gray-600 text-sm">Total Amount</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      ₹{order.total}
                    </p>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 text-sm">
                      Your payment is encrypted and secure
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handlePayment}
                    className="w-full bg-green-600 hover:bg-green-700 py-6 text-base"
                  >
                    Pay ₹{order.total}
                  </Button>

                  <p className="text-xs text-gray-600 text-center">
                    You will be redirected to {selectedMethod.toUpperCase()} to complete payment
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Processing Step
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-2 border-blue-200">
          <CardContent className="pt-8 pb-8 space-y-6">
            {/* Loading Animation */}
            <div className="flex justify-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0">
                  <div className="w-full h-full border-4 border-blue-200 rounded-full" />
                  <div
                    className="absolute inset-0 border-4 border-transparent border-t-blue-600 border-r-blue-600 rounded-full animate-spin"
                    style={{
                      animation: 'spin 1s linear infinite',
                      borderTopColor: '#2563eb',
                      borderRightColor: '#2563eb'
                    }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              </div>
            </div>

            {/* Progress Text */}
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Processing Payment
              </h3>
              <p className="text-gray-600 text-sm">
                Please wait while we securely process your payment...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(processingProgress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                {Math.round(processingProgress)}%
              </p>
            </div>

            {/* Status Steps */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <span>✓</span>
                <span>Validating payment details</span>
              </div>
              <div className={processingProgress > 33 ? 'text-green-600 flex items-center gap-2' : 'text-gray-400 flex items-center gap-2'}>
                <span>{processingProgress > 33 ? '✓' : '○'}</span>
                <span>Processing transaction</span>
              </div>
              <div className={processingProgress > 66 ? 'text-green-600 flex items-center gap-2' : 'text-gray-400 flex items-center gap-2'}>
                <span>{processingProgress > 66 ? '✓' : '○'}</span>
                <span>Confirming payment</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Don't close this window. This will only take a moment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success Step
  if (step === 'success') {
    const orderId = generateOrderId();
    return (
      <PaymentSuccessScreen
        orderId={orderId}
        totalAmount={order.total}
        sellerName={order.sellerName}
        deliveryDate={order.deliveryDate}
        deliveryAddress={order.deliveryAddress}
        paymentMethod={selectedMethod.toUpperCase()}
        itemsCount={order.items.length}
        onDownloadInvoice={() => console.log('Download invoice')}
        onShareOrder={() => console.log('Share order')}
        onViewOrder={() => onSuccess?.(orderId)}
        onBackHome={() => onBack?.()}
      />
    );
  }

  // Failure Step
  if (step === 'failure') {
    return (
      <PaymentFailureScreen
        reason="card_declined"
        amount={order.total}
        onRetry={handleRetry}
        onChangeMethod={handleChangeMethod}
        onGoBack={handleGoBack}
        onContactSupport={() => console.log('Contact support')}
      />
    );
  }

  return null;
};

export default PaymentPage;
