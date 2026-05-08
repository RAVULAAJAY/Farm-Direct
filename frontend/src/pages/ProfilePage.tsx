import React, { useEffect, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Edit,
  Save,
  X
} from 'lucide-react';
import { isProfileComplete, User, UserRole } from '@/context/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import { useGlobalState } from '@/context/GlobalStateContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfilePageProps {
  user: User;
  requireCompletion?: boolean;
}

const getDashboardPath = (role: UserRole): string => {
  switch (role) {
    case 'farmer':
      return '/farmer/dashboard';
    case 'buyer':
      return '/buyer/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/dashboard';
  }
};

const ProfilePage: React.FC<ProfilePageProps> = ({ user, requireCompletion = false }) => {
  const navigate = useNavigate();
  const { updateUser, products, orders, favoriteProductIds, getOrderCountByBuyer, getTotalSpentByBuyer } = useGlobalState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [paymentSaveStatus, setPaymentSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [completionError, setCompletionError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isPaymentEditing, setIsPaymentEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
    location: user.location,
    farmName: user.farmName ?? `${user.name}'s Farm`,
    farmDetails: user.farmDetails ?? '',
  });
  const [paymentFormData, setPaymentFormData] = useState({
    bankName: user.paymentDetails?.bankName ?? '',
    accountNumber: user.paymentDetails?.accountNumber ?? '',
    ifscOrUpi: user.paymentDetails?.ifscOrUpi ?? '',
    upiQrCodeDataUrl: user.paymentDetails?.upiQrCodeDataUrl ?? '',
    upiQrCodeFileName: user.paymentDetails?.upiQrCodeFileName ?? '',
  });

  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      farmName: user.farmName ?? `${user.name}'s Farm`,
      farmDetails: user.farmDetails ?? '',
    });

    setPaymentFormData({
      bankName: user.paymentDetails?.bankName ?? '',
      accountNumber: user.paymentDetails?.accountNumber ?? '',
      ifscOrUpi: user.paymentDetails?.ifscOrUpi ?? '',
      upiQrCodeDataUrl: user.paymentDetails?.upiQrCodeDataUrl ?? '',
      upiQrCodeFileName: user.paymentDetails?.upiQrCodeFileName ?? '',
    });
  }, [user]);

  useEffect(() => {
    if (requireCompletion) {
      setIsEditing(true);
    }
  }, [requireCompletion]);

  useEffect(() => {
    const shouldStartEditing = searchParams.get('edit') === 'true';
    if (!shouldStartEditing || requireCompletion) {
      return;
    }

    setIsEditing(true);

    const updatedParams = new URLSearchParams(searchParams);
    updatedParams.delete('edit');
    setSearchParams(updatedParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const farmerStats = useMemo(() => {
    if (user.role !== 'farmer') {
      return { activeListings: 0, totalRevenue: 0, deliveredOrders: 0 };
    }

    const myProducts = products.filter((product) => product.farmerId === user.id);
    const myProductIds = new Set(myProducts.map((product) => product.id));
    const myOrders = orders.filter((order) => myProductIds.has(order.productId));
    const deliveredOrders = myOrders.filter((order) => order.status === 'delivered').length;
    const totalRevenue = myOrders
      .filter((order) => order.status === 'delivered')
      .reduce((sum, order) => sum + order.totalPrice, 0);

    return {
      activeListings: myProducts.length,
      totalRevenue,
      deliveredOrders,
    };
  }, [orders, products, user.id, user.role]);

  const buyerStats = useMemo(() => {
    if (user.role !== 'buyer') {
      return { ordersPlaced: 0, totalSpent: 0, savedItems: 0 };
    }

    return {
      ordersPlaced: getOrderCountByBuyer(user.id),
      totalSpent: getTotalSpentByBuyer(user.id),
      savedItems: favoriteProductIds.length,
    };
  }, [favoriteProductIds.length, getOrderCountByBuyer, getTotalSpentByBuyer, user.id, user.role]);

  const farmerProofDataUrl = user.role === 'farmer' ? user.farmerOnboarding?.idProofDataUrl ?? '' : '';
  const farmerProofFileName = user.role === 'farmer' ? user.farmerOnboarding?.idProofFileName ?? 'ID proof' : '';
  const buyerProofDataUrl = user.role === 'buyer' ? user.buyerOnboarding?.idProofDataUrl ?? '' : '';
  const buyerProofFileName = user.role === 'buyer' ? user.buyerOnboarding?.idProofFileName ?? 'ID proof' : '';

  const getRoleEmoji = (role: string) => {
    switch(role) {
      case 'farmer': return '🧑‍🌾';
      case 'buyer': return '🧑‍💼';
      case 'admin': return '🔐';
      default: return '👤';
    }
  };

  const getRoleClassName = (role: string) => {
    if (role === 'farmer') {
      return {
        avatar: 'bg-green-100',
        badge: 'bg-green-100 text-green-800',
      };
    }

    if (role === 'buyer') {
      return {
        avatar: 'bg-blue-100',
        badge: 'bg-blue-100 text-blue-800',
      };
    }

    if (role === 'admin') {
      return {
        avatar: 'bg-purple-100',
        badge: 'bg-purple-100 text-purple-800',
      };
    }

    return {
      avatar: 'bg-gray-100',
      badge: 'bg-gray-100 text-gray-800',
    };
  };

  const handleSave = () => {
    const nextUser: User = {
      ...user,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      farmName: user.role === 'farmer' ? formData.farmName : undefined,
      farmDetails: user.role === 'farmer' ? formData.farmDetails : undefined,
    };

    if (requireCompletion && !isProfileComplete(nextUser)) {
      setCompletionError('Please fill all required profile fields before continuing.');
      return;
    }

    updateUser(user.id, {
      name: nextUser.name,
      email: nextUser.email,
      phone: nextUser.phone,
      location: nextUser.location,
      farmName: nextUser.farmName,
      farmDetails: nextUser.farmDetails,
    });

    setCompletionError('');
    setSaveStatus('saved');
    setIsEditing(false);

    if (requireCompletion) {
      navigate(getDashboardPath(user.role), { replace: true });
      return;
    }

    window.setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      farmName: user.farmName ?? `${user.name}'s Farm`,
      farmDetails: user.farmDetails ?? '',
    });
    setIsEditing(false);
  };

  const handlePaymentCancel = () => {
    setPaymentFormData({
      bankName: user.paymentDetails?.bankName ?? '',
      accountNumber: user.paymentDetails?.accountNumber ?? '',
      ifscOrUpi: user.paymentDetails?.ifscOrUpi ?? '',
      upiQrCodeDataUrl: user.paymentDetails?.upiQrCodeDataUrl ?? '',
      upiQrCodeFileName: user.paymentDetails?.upiQrCodeFileName ?? '',
    });
    setPaymentError('');
    setIsPaymentEditing(false);
  };

  const handlePaymentQrUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      setPaymentError('Please upload an image file for the UPI QR code.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setPaymentFormData((prev) => ({
        ...prev,
        upiQrCodeDataUrl: result,
        upiQrCodeFileName: selectedFile.name,
      }));
      setPaymentError('');
    };

    reader.onerror = () => {
      setPaymentError('Unable to read this QR image. Please try another file.');
    };

    reader.readAsDataURL(selectedFile);
    event.target.value = '';
  };

  const handlePaymentSave = async () => {
    const bankName = paymentFormData.bankName.trim();
    const accountNumber = paymentFormData.accountNumber.trim();
    const ifscOrUpi = paymentFormData.ifscOrUpi.trim();

    if (!bankName || !accountNumber || !ifscOrUpi) {
      setPaymentError('Please fill bank name, account number, and IFSC/UPI before saving.');
      return;
    }

    try {
      await updateUser(user.id, {
        paymentDetails: {
          bankName,
          accountNumber,
          ifscOrUpi,
          upiQrCodeDataUrl: paymentFormData.upiQrCodeDataUrl || undefined,
          upiQrCodeFileName: paymentFormData.upiQrCodeFileName || undefined,
        },
      });

      setPaymentError('');
      setPaymentSaveStatus('saved');
      setIsPaymentEditing(false);
      window.setTimeout(() => setPaymentSaveStatus('idle'), 2000);
    } catch {
      setPaymentError('Unable to save payment info right now. Please try again.');
    }
  };

  const roleStyle = getRoleClassName(user.role);

  return (
    <div className="space-y-6 max-w-2xl">
      {requireCompletion && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900 font-medium">
              Complete your profile to continue using FarmDirect.
            </p>
            <p className="text-sm text-amber-800 mt-1">
              Name, email, phone, and location are required for all users. Farmers also need farm name and farm bio.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.profilePhoto} alt={user.name} />
                <AvatarFallback className={`text-3xl ${roleStyle.avatar}`}>
                  {getRoleEmoji(user.role)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{formData.name}</h1>
                <div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${roleStyle.badge}`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </div>
              </div>
            </div>

            {!isEditing ? (
              <Button variant="outline" className="gap-2" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                {!requireCompletion && (
                  <Button variant="outline" className="gap-2" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                )}
                <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={handleSave}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
          </div>

          {saveStatus === 'saved' && (
            <p className="mt-4 text-sm text-green-700">Profile updated successfully.</p>
          )}

          {completionError && (
            <p className="mt-4 text-sm text-red-700">{completionError}</p>
          )}

          <div className="space-y-2 text-sm text-gray-600 mt-4">
            {user.createdAt && <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Profile Stats */}
      {user.role === 'farmer' && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{farmerStats.activeListings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Delivered Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{farmerStats.deliveredOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">₹{farmerStats.totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {user.role === 'buyer' && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Orders Placed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{buyerStats.ordersPlaced}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">₹{buyerStats.totalSpent.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Saved Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">{buyerStats.savedItems}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle>{user.role === 'farmer' ? 'Farm Details' : 'About'}</CardTitle>
          {user.role === 'farmer' && <CardDescription>Update your farm profile visible to buyers.</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {user.role === 'farmer' ? (
            <>
              <div>
                <Label>Farm Name</Label>
                <Input
                  value={formData.farmName}
                  onChange={(event) => setFormData((prev) => ({ ...prev, farmName: event.target.value }))}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <Label>Farm Bio</Label>
                <Textarea
                  value={formData.farmDetails}
                  onChange={(event) => setFormData((prev) => ({ ...prev, farmDetails: event.target.value }))}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50' : ''}
                  placeholder="Tell buyers about your farm, practices, and produce quality."
                />
              </div>
              <div className="space-y-2">
                <Label>ID Proof</Label>
                <div className="rounded-lg border bg-gray-50 p-4">
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
                  <p className="mt-3 text-sm font-medium text-gray-900">{farmerProofFileName}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-gray-700">
              <p>
                {user.location
                  ? `Buyer based in ${user.location}.`
                  : 'Buyer profile details are shown here.'}
              </p>
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{user.phone || 'Not added'}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{user.location || 'Not added'}</p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-gray-500">Joined</p>
                  <p className="font-medium text-gray-900">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'}
                  </p>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <Label>ID Proof</Label>
                <div className="rounded-lg border bg-gray-50 p-4">
                  {buyerProofDataUrl ? (
                    buyerProofDataUrl.startsWith('data:image/') ? (
                      <img
                        src={buyerProofDataUrl}
                        alt="Uploaded ID proof"
                        className="h-56 w-full rounded-md object-contain bg-white"
                      />
                    ) : buyerProofDataUrl.startsWith('data:application/pdf') ? (
                      <iframe
                        title="Uploaded ID proof"
                        src={buyerProofDataUrl}
                        className="h-56 w-full rounded-md bg-white"
                      />
                    ) : (
                      <p className="text-sm text-gray-600">Uploaded proof is available, but this format cannot be previewed here.</p>
                    )
                  ) : (
                    <p className="text-sm text-gray-600">No proof uploaded yet.</p>
                  )}
                  <p className="mt-3 text-sm font-medium text-gray-900">{buyerProofFileName}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {user.role === 'farmer' && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Info</CardTitle>
            <CardDescription>Manage payout details and UPI QR code shown to buyers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={paymentFormData.bankName}
                  onChange={(event) =>
                    setPaymentFormData((prev) => ({ ...prev, bankName: event.target.value }))
                  }
                  disabled={!isPaymentEditing}
                  className={!isPaymentEditing ? 'bg-gray-50' : ''}
                  placeholder="Enter bank name"
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={paymentFormData.accountNumber}
                  onChange={(event) =>
                    setPaymentFormData((prev) => ({ ...prev, accountNumber: event.target.value }))
                  }
                  disabled={!isPaymentEditing}
                  className={!isPaymentEditing ? 'bg-gray-50' : ''}
                  placeholder="Enter account number"
                />
              </div>
              <div>
                <Label>IFSC / UPI</Label>
                <Input
                  value={paymentFormData.ifscOrUpi}
                  onChange={(event) =>
                    setPaymentFormData((prev) => ({ ...prev, ifscOrUpi: event.target.value }))
                  }
                  disabled={!isPaymentEditing}
                  className={!isPaymentEditing ? 'bg-gray-50' : ''}
                  placeholder="Enter IFSC code or UPI ID"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>UPI QR Code</Label>
              {paymentFormData.upiQrCodeDataUrl ? (
                <div className="rounded-lg border bg-gray-50 p-4">
                  <img
                    src={paymentFormData.upiQrCodeDataUrl}
                    alt="UPI QR code"
                    className="mx-auto h-52 w-52 rounded-md border bg-white object-contain"
                  />
                  <p className="mt-3 text-center text-sm font-medium text-gray-900">
                    {paymentFormData.upiQrCodeFileName || 'UPI QR image'}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-600">
                  No UPI QR uploaded yet.
                </div>
              )}

              {isPaymentEditing && (
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handlePaymentQrUpload}
                />
              )}
            </div>

            {paymentError && <p className="text-sm text-red-700">{paymentError}</p>}
            {paymentSaveStatus === 'saved' && (
              <p className="text-sm text-green-700">Payment information updated successfully.</p>
            )}

            {!isPaymentEditing ? (
              <Button
                  type="button"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setIsPaymentEditing(true);
                  setPaymentError('');
                }}
              >
                {user.paymentDetails ? 'Edit Payment Info' : 'Add Payment Info'}
              </Button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" className="bg-green-600 hover:bg-green-700" onClick={handlePaymentSave}>
                  Update Payment Info
                </Button>
                <Button type="button" variant="outline" onClick={handlePaymentCancel}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfilePage;
