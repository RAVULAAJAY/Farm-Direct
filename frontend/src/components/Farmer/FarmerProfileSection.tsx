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
      totalRevenue: deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A',
    };
  }, [orders, products, user.createdAt, user.id]);

  const farmerProofDataUrl = user.farmerOnboarding?.idProofDataUrl ?? '';
  const farmerProofFileName = user.farmerOnboarding?.idProofFileName ?? 'ID proof';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Header with Profile */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="text-6xl bg-green-100 w-24 h-24 rounded-full flex items-center justify-center">
                🧑‍🌾
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{user.farmName || `${user.name}'s Farm`}</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={onEditProfile}>
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{user.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Location</p>
                <p className="font-medium text-gray-900">{user.location}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Active Listings</p>
              <p className="text-2xl font-bold text-green-700">{farmerStats.activeListings}</p>
              <p className="text-xs text-gray-500 mt-1">of {farmerStats.totalListings}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Total Sold</p>
              <p className="text-2xl font-bold text-blue-700">{farmerStats.totalSold}</p>
              <p className="text-xs text-gray-500 mt-1">products</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-xs text-gray-600 mb-1">Revenue</p>
              <p className="text-2xl font-bold text-purple-700">₹{farmerStats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">this month</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-xs text-gray-600 mb-1">Member Since</p>
              <p className="text-lg font-bold text-orange-700">{farmerStats.joinDate}</p>
              <p className="text-xs text-gray-500 mt-1">active</p>
            </div>
          </div>

          {/* Bio Section */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">About</h3>
            <p className="text-gray-700">
              {user.farmDetails || 'Add your farm details in Profile or Settings to help buyers trust your produce and practices.'}
            </p>
          </div>

          {/* ID Proof */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">ID Proof</h3>
            <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
              {farmerProofDataUrl ? (
                farmerProofDataUrl.startsWith('data:image/') ? (
                  <img
                    src={farmerProofDataUrl}
                    alt="Uploaded ID proof"
                    className="h-56 w-full rounded-md object-contain bg-white"
                  />
                ) : farmerProofDataUrl.startsWith('data:application/pdf') ? (
                  <iframe
                    title="Uploaded ID proof"
                    src={farmerProofDataUrl}
                    className="h-56 w-full rounded-md bg-white"
                  />
                ) : (
                  <p className="text-sm text-gray-600">Uploaded proof is available, but this format cannot be previewed here.</p>
                )
              ) : (
                <p className="text-sm text-gray-600">No proof uploaded yet.</p>
              )}
              <p className="text-sm font-medium text-gray-900">{farmerProofFileName}</p>
            </div>
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
