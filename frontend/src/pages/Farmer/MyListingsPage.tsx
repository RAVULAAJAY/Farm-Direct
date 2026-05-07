import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Search,
  Filter
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { User } from '@/context/AuthContext';
import FarmerManagementPanel from '@/components/Farmer/FarmerManagementPanel';

interface MyListingsPageProps {
  user: User;
}

const MyListingsPage: React.FC<MyListingsPageProps> = ({ user }) => {
  return <FarmerManagementPanel />;

  const [searchTerm, setSearchTerm] = React.useState('');

  // Mock listings data
  const listings = [
    {
      id: 1,
      name: 'Organic Tomatoes',
      quantity: '50 kg',
      price: '₹30/kg',
      status: 'Active',
      views: 234,
      date: '2026-03-15'
    },
    {
      id: 2,
      name: 'Fresh Carrots',
      quantity: '30 kg',
      price: '₹20/kg',
      status: 'Active',
      views: 156,
      date: '2026-03-14'
    },
    {
      id: 3,
      name: 'Spinach Bundle',
      quantity: '25 kg',
      price: '₹15/kg',
      status: 'Sold Out',
      views: 89,
      date: '2026-03-10'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
          <p className="text-gray-600 mt-2">Manage your crop listings and availability</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 gap-2">
          <Plus className="h-4 w-4" />
          Add New Listing
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search listings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Crop Listings</CardTitle>
          <CardDescription>Total: {listings.length} listings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Crop Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Quantity</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Views</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{listing.name}</p>
                      <p className="text-xs text-gray-500">{listing.date}</p>
                    </td>
                    <td className="py-3 px-4">{listing.quantity}</td>
                    <td className="py-3 px-4 font-semibold text-green-600">{listing.price}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        listing.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{listing.views}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="p-1 hover:bg-gray-200 rounded text-gray-600">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-200 rounded text-blue-600">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-200 rounded text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">2</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">479</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">12.5%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyListingsPage;
