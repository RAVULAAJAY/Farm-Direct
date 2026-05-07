import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Smartphone,
  Building2,
  DollarSign,
  Check,
  Lock
} from 'lucide-react';

export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'cod';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: React.ReactNode;
  description: string;
  badge?: string;
  isPopular?: boolean;
  isAvailable: boolean;
  processingTime: string;
}

interface PaymentOptionsProps {
  selectedMethod?: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  disabled?: boolean;
}

const PaymentOptions: React.FC<PaymentOptionsProps> = ({
  selectedMethod = 'upi',
  onSelectMethod,
  disabled = false
}) => {
  const paymentOptions: PaymentOption[] = [
    {
      id: 'upi',
      name: 'UPI',
      icon: <Smartphone className="h-6 w-6" />,
      description: 'Google Pay, PhonePe, Paytm',
      badge: 'Popular',
      isPopular: true,
      isAvailable: true,
      processingTime: 'Instant'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: <CreditCard className="h-6 w-6" />,
      description: 'Visa, Mastercard, RuPay',
      isAvailable: true,
      processingTime: 'Instant'
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      icon: <Building2 className="h-6 w-6" />,
      description: 'All major banks',
      isAvailable: true,
      processingTime: '1-2 seconds'
    },
    {
      id: 'wallet',
      name: 'Digital Wallet',
      icon: <DollarSign className="h-6 w-6" />,
      description: 'Google Pay Wallet Balance',
      isAvailable: true,
      processingTime: 'Instant'
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      icon: <DollarSign className="h-6 w-6" />,
      description: 'Pay when you receive',
      badge: 'Available',
      isAvailable: true,
      processingTime: 'On Delivery'
    }
  ];

  const availableOptions = paymentOptions.filter(opt => opt.isAvailable);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Select Payment Method</h3>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Lock className="h-3 w-3" />
          Secure Payment
        </div>
      </div>

      <div className="space-y-2">
        {availableOptions.map((option) => (
          <Card
            key={option.id}
            className={`cursor-pointer transition-all border-2 ${
              selectedMethod === option.id
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onSelectMethod(option.id)}
          >
            <div className="p-4 flex items-start gap-4">
              {/* Radio Button */}
              <div className="flex-shrink-0 mt-1">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedMethod === option.id
                      ? 'border-green-600 bg-green-600'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedMethod === option.id && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className={selectedMethod === option.id ? 'text-green-600' : 'text-gray-600'}>
                    {option.icon}
                  </div>
                  <h4 className="font-semibold text-gray-900">{option.name}</h4>
                  {option.badge && (
                    <Badge
                      variant={option.isPopular ? 'default' : 'secondary'}
                      className={option.isPopular ? 'bg-green-100 text-green-800 border-0' : ''}
                    >
                      {option.badge}
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-2">{option.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    ⏱️ Processing: {option.processingTime}
                  </span>
                  {selectedMethod === option.id && (
                    <span className="text-xs font-semibold text-green-600">✓ Selected</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Payment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
        <p>
          ✓ Your payment information is encrypted and secured by industry-standard SSL technology
        </p>
      </div>
    </div>
  );
};

export default PaymentOptions;
