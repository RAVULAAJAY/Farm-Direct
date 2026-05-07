import React, { useState } from 'react';
import { UserPlus, Truck, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DeliveryMethod = 'self-pickup' | 'farmer-delivery';

interface DeliveryOptionsProps {
  onDeliveryMethodSelect: (method: DeliveryMethod, details: DeliveryDetails) => void;
  selectedMethod?: DeliveryMethod;
  isLoading?: boolean;
}

export interface DeliveryDetails {
  method: DeliveryMethod;
  scheduledDate?: string;
  scheduledTime?: string;
  pickupLocation?: string;
  deliveryAddress?: string;
  cost: number;
}

const DeliveryOptions: React.FC<DeliveryOptionsProps> = ({
  onDeliveryMethodSelect,
  selectedMethod,
  isLoading = false
}) => {
  const [method, setMethod] = useState<DeliveryMethod | null>(selectedMethod || null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const deliveryOptions = [
    {
      id: 'self-pickup' as DeliveryMethod,
      title: 'Self Pickup',
      description: 'Pick up your order from the farm',
      icon: UserPlus,
      benefits: [
        'Free delivery',
        'Fresh from farm',
        'Support local farmer',
        'Pick your own quality'
      ],
      cost: 0,
      locations: [
        'Sector 45, Noida - Farm Gate',
        'Sector 51, Noida - Collection Center',
        'Greater Noida - Market Area'
      ]
    },
    {
      id: 'farmer-delivery' as DeliveryMethod,
      title: 'Farmer Delivery',
      description: 'Farmer delivers to your doorstep',
      icon: Truck,
      benefits: [
        'Doorstep delivery',
        'Convenient & time-saving',
        'Track in real-time',
        'Same-day delivery available'
      ],
      cost: 50,
      timeSlots: ['8:00 AM - 10:00 AM', '10:00 AM - 12:00 PM', '2:00 PM - 4:00 PM', '4:00 PM - 6:00 PM']
    }
  ];

  const handleSelectMethod = () => {
    if (!method) return;

    const option = deliveryOptions.find(o => o.id === method)!;
    let details: DeliveryDetails = {
      method,
      cost: option.cost
    };

    if (method === 'self-pickup') {
      if (!date || !pickupLocation) {
        alert('Please select date and pickup location');
        return;
      }
      details = { ...details, scheduledDate: date, pickupLocation };
    } else {
      if (!date || !time || !address) {
        alert('Please fill in all delivery details');
        return;
      }
      details = { ...details, scheduledDate: date, scheduledTime: time, deliveryAddress: address };
    }

    onDeliveryMethodSelect(method, details);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Delivery Method</h2>
        <p className="text-gray-600">Select how you'd like to receive your order</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deliveryOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = method === option.id;

          return (
            <Card
              key={option.id}
              className={`p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'border-2 border-transparent hover:border-gray-300'
              }`}
              onClick={() => setMethod(option.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{option.title}</h3>
                    <p className="text-xs text-gray-600">{option.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">
                    {option.cost === 0 ? 'Free' : `₹${option.cost}`}
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="mb-4 pl-10">
                <ul className="space-y-1">
                  {option.benefits.map((benefit, idx) => (
                    <li key={idx} className="text-xs text-gray-700 flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Radio Button */}
              <div className="flex items-center">
                <input
                  type="radio"
                  checked={isSelected}
                  onChange={() => setMethod(option.id)}
                  className="h-4 w-4 text-blue-600"
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Details Form */}
      {method && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {method === 'self-pickup' ? 'Pickup Details' : 'Delivery Details'}
          </h3>

          <div className="space-y-4">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-2" />
                Delivery/Pickup Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={today}
                max={maxDateStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {method === 'farmer-delivery' ? (
              <>
                {/* Time Slot Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Delivery Time Slot <span className="text-red-500">*</span>
                  </label>
                  <Select value={time} onValueChange={setTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryOptions[1].timeSlots?.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Enter your complete delivery address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Delivery Info */}
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Delivery Fee: ₹{deliveryOptions[1].cost}</p>
                    <p className="text-xs mt-1">Free delivery on orders above ₹500</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Pickup Location Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Location <span className="text-red-500">*</span>
                  </label>
                  <Select value={pickupLocation} onValueChange={setPickupLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pickup location" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryOptions[0].locations?.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pickup Info */}
                <div className="bg-green-100 border border-green-300 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Free Pickup</p>
                    <p className="text-xs mt-1">Farm gate or collection center - Zero delivery charges</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleSelectMethod}
              disabled={isLoading || !date || (method === 'farmer-delivery' && !time) || (method === 'farmer-delivery' && !address) || (method === 'self-pickup' && !pickupLocation)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Processing...' : 'Continue with this option'}
            </Button>
            <Button
              onClick={() => setMethod(null)}
              variant="outline"
              className="flex-1"
            >
              Change
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DeliveryOptions;
