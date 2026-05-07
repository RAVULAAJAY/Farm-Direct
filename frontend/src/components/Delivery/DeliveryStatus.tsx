import React, { useState, useEffect } from 'react';
import { Check, Clock, Truck, MapPin, Phone, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type DeliveryStatus = 'confirmed' | 'on-the-way' | 'arriving-soon' | 'delivered';

export interface DeliveryStatusData {
  orderId: string;
  status: DeliveryStatus;
  method: 'self-pickup' | 'farmer-delivery';
  farmerName: string;
  farmerPhone: string;
  farmerImage?: string;
  estimatedTime?: string;
  actualTime?: string;
  location?: {
    current?: string;
    destination: string;
  };
  timeline: {
    confirmed: { time: string; completed: boolean };
    processing: { time: string; completed: boolean };
    on_the_way?: { time: string; completed: boolean };
    arriving_soon?: { time: string; completed: boolean };
    delivered?: { time: string; completed: boolean };
  };
}

interface DeliveryStatusProps {
  delivery: DeliveryStatusData;
  onContactFarmer?: () => void;
}

const DeliveryStatus: React.FC<DeliveryStatusProps> = ({
  delivery,
  onContactFarmer
}) => {
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    // Calculate progress
    const statuses: DeliveryStatus[] = ['confirmed', 'on-the-way', 'arriving-soon', 'delivered'];
    const currentIndex = statuses.indexOf(delivery.status);
    const progress = ((currentIndex + 1) / statuses.length) * 100;
    setProgressPercent(progress);
  }, [delivery.status]);

  const getStatusIcon = (status: DeliveryStatus) => {
    switch (status) {
      case 'confirmed':
        return Check;
      case 'on-the-way':
        return Truck;
      case 'arriving-soon':
        return MapPin;
      case 'delivered':
        return UserCheck;
      default:
        return Clock;
    }
  };

  const getStatusLabel = (status: DeliveryStatus) => {
    switch (status) {
      case 'confirmed':
        return 'Order Confirmed';
      case 'on-the-way':
        return 'On The Way';
      case 'arriving-soon':
        return 'Arriving Soon';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Pending';
    }
  };

  const CurrentStatusIcon = getStatusIcon(delivery.status);

  return (
    <div className="space-y-6">
      {/* Delivery Status Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 border-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white text-lg font-semibold">Your Delivery Status</h3>
            <p className="text-blue-100 text-sm mt-1">Order #{delivery.orderId}</p>
          </div>
          <div className="bg-white/20 p-3 rounded-full">
            <CurrentStatusIcon className="h-8 w-8 text-white" />
          </div>
        </div>
      </Card>

      {/* Order Method Badge */}
      <div className="flex gap-2">
        {delivery.method === 'self-pickup' ? (
          <div className="inline-flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full">
            <span className="text-lg">🏪</span>
            <span className="text-purple-700 font-medium text-sm">Self Pickup</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full">
            <Truck className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700 font-medium text-sm">Farmer Delivery</span>
          </div>
        )}
        {delivery.status === 'delivered' && (
          <div className="inline-flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-green-700 font-medium text-sm">Completed</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-900">Progress</h4>
          <span className="text-2xl font-bold text-blue-600">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Current Status */}
      <Card className="p-6 border-l-4 border-blue-500">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <CurrentStatusIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Current Status</p>
            <h3 className="text-xl font-semibold text-gray-900">
              {getStatusLabel(delivery.status)}
            </h3>
            {delivery.estimatedTime && (
              <p className="text-sm text-gray-500 mt-1">
                Estimated arrival: {delivery.estimatedTime}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Delivery Timeline</h4>
        <div className="space-y-4">
          {Object.entries(delivery.timeline).map(([key, item], index) => {
            const isCompleted = item.completed;
            const isCurrent = delivery.status === key.replace('_', '-') || 
                            (key === 'on_the_way' && delivery.status === 'on-the-way');
            
            return (
              <div key={key} className="flex gap-4">
                {/* Timeline Dot and Line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-green-100 border-green-500'
                        : isCurrent
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-gray-100 border-gray-300'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  {index < Object.entries(delivery.timeline).length - 1 && (
                    <div
                      className={`w-0.5 h-12 ${
                        isCompleted ? 'bg-green-200' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>

                {/* Timeline Content */}
                <div className="pb-4">
                  <p className="font-semibold text-gray-900 capitalize">
                    {key.replace('_', ' ')}
                  </p>
                  <p
                    className={`text-sm ${
                      isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {item.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Farmer Info - Only for delivery */}
      {delivery.method === 'farmer-delivery' && (
        <Card className="p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Delivering Farmer</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {delivery.farmerImage ? (
                <img
                  src={delivery.farmerImage}
                  alt={delivery.farmerName}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg">🧑‍🌾</span>
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{delivery.farmerName}</p>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {delivery.farmerPhone}
                </div>
              </div>
            </div>
            <Button onClick={onContactFarmer} className="bg-blue-600 hover:bg-blue-700">
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
          </div>
        </Card>
      )}

      {/* Location Info - For delivery and arriving soon */}
      {delivery.method === 'farmer-delivery' && 
       (delivery.status === 'on-the-way' || delivery.status === 'arriving-soon') && (
        <Card className="p-6 bg-orange-50 border-l-4 border-orange-500">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              {delivery.location?.current && (
                <>
                  <p className="text-sm text-gray-600">Current Location</p>
                  <p className="font-semibold text-gray-900">{delivery.location.current}</p>
                </>
              )}
              <p className="text-sm text-gray-600 mt-2">Heading to</p>
              <p className="font-semibold text-gray-900">{delivery.location?.destination}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Pickup Location - For self pickup */}
      {delivery.method === 'self-pickup' && (
        <Card className="p-6 bg-purple-50 border-l-4 border-purple-500">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Pickup Location</p>
              <p className="font-semibold text-gray-900">{delivery.location?.destination}</p>
              {delivery.status === 'confirmed' && (
                <p className="text-xs text-purple-600 mt-2">Ready to pick up anytime within 7 days</p>
              )}
              {delivery.status === 'delivered' && (
                <p className="text-xs text-green-600 mt-2">✓ You have picked up your order</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Delivery Completed Message */}
      {delivery.status === 'delivered' && (
        <Card className="p-6 bg-green-50 border-2 border-green-500 text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-green-100 p-3 rounded-full">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h4 className="font-semibold text-gray-900 text-lg">Order Delivered Successfully!</h4>
          <p className="text-gray-600 text-sm mt-2">
            Thank you for your order. We hope you enjoy your fresh produce!
          </p>
        </Card>
      )}
    </div>
  );
};

export default DeliveryStatus;
