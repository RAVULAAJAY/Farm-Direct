import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Edit,
  MapPin,
  Phone,
  Mail,
  Award
} from 'lucide-react';
import { User } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';

interface FarmerProfileSectionProps {
  user: User;
  onEditProfile?: () => void;
}

const FarmerProfileSection: React.FC<FarmerProfileSectionProps> = ({
  user,
  onEditProfile
}) => {
  const { products, orders } = useGlobalState();

  const farmerStats = useMemo(() => {
    const myProducts = products.filter((product) => product.farmerId === user.id);
    const myProductIds = new Set(myProducts.map((product) => product.id));
    const myOrders = orders.filter((order) => myProductIds.has(order.productId));
    const deliveredOrders = myOrders.filter((order) => order.status === 'delivered');

    return {
      totalListings: myProducts.length,
      activeListings: myProducts.filter((product) => (product.stock ?? product.quantity ?? 0) > 0).length,
      totalSold: deliveredOrders.reduce((sum, order) => sum + order.quantity, 0),
      joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A',
    };
  }, [orders, products, user.createdAt, user.id]);


  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Header with Profile */}
          <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-4xl">
                  🧑‍🌾
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">{user.farmName || `${user.name}'s Farm`}</p>
                </div>
              </div>
              {onEditProfile ? (
                <Button variant="outline" className="gap-2" onClick={onEditProfile}>
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              ) : null}
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-gray-600 shadow-sm">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 break-words">{user.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-gray-600 shadow-sm">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 truncate">{user.phone}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-gray-600 shadow-sm">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 leading-6 break-words">{user.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-xs text-gray-600 mb-1">Joined</p>
              <p className="text-lg font-bold text-orange-700">{farmerStats.joinDate}</p>
              <p className="text-xs text-gray-500 mt-1">member since</p>
            </div>
          </div>

          {/* Bio Section */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">About</h3>
            <p className="text-gray-700">
              {user.farmDetails || 'Add your farm details in Profile or Settings to help buyers trust your produce and practices.'}
            </p>
          </div>


          {/* Certifications */}
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">Verified Farmer</p>
                <p className="text-sm text-green-800 mt-1">Certified organic farming practices • Government verified • 5+ years experience</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FarmerProfileSection;
