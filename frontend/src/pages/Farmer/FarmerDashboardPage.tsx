import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Package, ShoppingCart, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import FarmerProfileSection from '@/components/Farmer/FarmerProfileSection';
import AddProductForm, { Product } from '@/components/Farmer/AddProductForm';
import ProductList from '@/components/Farmer/ProductList';
import ProductCard from '@/components/Farmer/ProductCard';
import FarmerManagementPanel from '@/components/Farmer/FarmerManagementPanel';

const FarmerDashboardPage: React.FC = () => {
  return <FarmerManagementPanel />;

  const { currentUser: user } = useAuth();
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Fresh Tomatoes',
      price: 40,
      quantity: 50,
      unit: 'kg',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%23EF4444"/%3E%3Cpath d="M50 10 Q60 20 60 30 Q60 40 50 45" fill="%23059669"/%3E%3C/svg%3E',
      location: 'Sector 45, Noida',
      description: 'Fresh, organic tomatoes grown without pesticides. Perfect for cooking.',
      category: 'vegetables',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      name: 'Honeycomb',
      price: 300,
      quantity: 20,
      unit: 'kg',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect x="10" y="10" width="80" height="80" fill="%23FCD34D"/%3E%3Cpath d="M30 30 M40 25 M50 30 M60 25 M70 30" stroke="%23F59E0B" stroke-width="2"/%3E%3C/svg%3E',
      location: 'Sector 45, Noida',
      description: 'Pure honeycomb, directly from the hive. Rich in nutrients.',
      category: 'honey',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: '3',
      name: 'Organic Spinach',
      price: 25,
      quantity: 5,
      unit: 'kg',
      image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cpath d="M50 20 Q70 30 70 50 Q70 70 50 80 Q30 70 30 50 Q30 30 50 20" fill="%23059669"/%3E%3C/svg%3E',
      location: 'Sector 45, Noida',
      description: 'Fresh organic spinach, nutrient-rich and delicious.',
      category: 'vegetables',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Calculate dashboard stats
  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.quantity > 0).length,
    totalInventory: products.reduce((sum, p) => sum + p.quantity, 0),
    totalValue: products.reduce((sum, p) => sum + (p.price * p.quantity), 0),
    lowStockProducts: products.filter(p => p.quantity > 0 && p.quantity <= 10).length,
    outOfStock: products.filter(p => p.quantity === 0).length
  };

  const handleAddProduct = (newProduct: Omit<Product, 'id' | 'createdAt'>) => {
    const product: Product = {
      ...newProduct,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    setProducts([product, ...products]);
    setShowAddForm(false);
    showSuccess(`"${product.name}" added successfully!`);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowEditDialog(true);
  };

  const handleSaveEdit = (updatedProduct: Omit<Product, 'id' | 'createdAt'>) => {
    const updated: Product = {
      ...updatedProduct,
      id: editingProduct!.id,
      createdAt: editingProduct!.createdAt
    };
    setProducts(products.map(p => p.id === updated.id ? updated : p));
    setShowEditDialog(false);
    setEditingProduct(null);
    showSuccess('Product updated successfully!');
  };

  const handleDeleteProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setProducts(products.filter(p => p.id !== productId));
    showSuccess(`"${product?.name}" deleted successfully!`);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your products and farm operations</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-3xl font-bold text-green-600">{stats.activeProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Total Inventory</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalInventory} units</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Inventory Value</p>
              <p className="text-3xl font-bold text-purple-600">₹{(stats.totalValue / 1000).toFixed(1)}k</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-3xl font-bold text-orange-600">{stats.lowStockProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts for Inventory Issues */}
      {stats.lowStockProducts > 0 && (
        <Alert className="bg-orange-50 border-orange-200 text-orange-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {stats.lowStockProducts} product{stats.lowStockProducts !== 1 ? 's' : ''} running low on stock. Consider adding more inventory.
          </AlertDescription>
        </Alert>
      )}

      {stats.outOfStock > 0 && (
        <Alert className="bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {stats.outOfStock} product{stats.outOfStock !== 1 ? 's' : ''} out of stock. Restock items to continue selling.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="add-product">Add Product</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <FarmerProfileSection user={user} />
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <ProductList
            products={products}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onAddNew={() => setShowAddForm(true)}
            isFarmerView={true}
            allowActions={true}
          />
        </TabsContent>

        {/* Add Product Tab */}
        <TabsContent value="add-product">
          <AddProductForm
            onSubmit={handleAddProduct}
            onCancel={() => setShowAddForm(false)}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update the product information</DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <AddProductForm
              onSubmit={handleSaveEdit}
              onCancel={() => {
                setShowEditDialog(false);
                setEditingProduct(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerDashboardPage;
