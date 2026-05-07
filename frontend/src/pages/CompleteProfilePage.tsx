import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';

interface CompleteProfilePageProps {
  user: User;
}

const getDashboardPath = (role: User['role']): string => {
  if (role === 'farmer') {
    return '/farmer/dashboard';
  }

  if (role === 'buyer') {
    return '/buyer/dashboard';
  }

  if (role === 'admin') {
    return '/admin/dashboard';
  }

  return '/dashboard';
};

const CompleteProfilePage: React.FC<CompleteProfilePageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useGlobalState();
  const [formData, setFormData] = useState({
    name: user.name,
    farmName: user.farmName ?? '',
    location: user.location,
    cropTypes: (user.cropTypes ?? []).join(', '),
    contactNumber: user.phone,
  });
  const [error, setError] = useState('');
  const showBlockedWarning = searchParams.get('warning') === 'profile-required';

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const cropTypes = formData.cropTypes
      .split(',')
      .map((crop) => crop.trim())
      .filter((crop) => crop.length > 0);

    const hasAllRequiredValues =
      formData.name.trim().length > 0 &&
      formData.farmName.trim().length > 0 &&
      formData.location.trim().length > 0 &&
      formData.contactNumber.trim().length > 0 &&
      cropTypes.length > 0;

    if (!hasAllRequiredValues) {
      setError('Please fill all required fields before continuing.');
      return;
    }

    updateUser(user.id, {
      name: formData.name.trim(),
      farmName: formData.farmName.trim(),
      location: formData.location.trim(),
      phone: formData.contactNumber.trim(),
      cropTypes,
    });

    navigate(getDashboardPath(user.role), { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-2xl py-4">
      <Card>
        <CardHeader>
          <CardTitle>Complete Profile</CardTitle>
          <CardDescription>
            Complete your farmer profile to continue to dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showBlockedWarning && (
            <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-900">
              <AlertDescription>
                Complete your profile first.
              </AlertDescription>
            </Alert>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(event) => handleFieldChange('name', event.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="farmName">Farm name</Label>
              <Input
                id="farmName"
                value={formData.farmName}
                onChange={(event) => handleFieldChange('farmName', event.target.value)}
                placeholder="Enter farm name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(event) => handleFieldChange('location', event.target.value)}
                placeholder="Enter farm location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cropTypes">Crop types</Label>
              <Input
                id="cropTypes"
                value={formData.cropTypes}
                onChange={(event) => handleFieldChange('cropTypes', event.target.value)}
                placeholder="e.g. Wheat, Rice, Tomato"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact number</Label>
              <Input
                id="contactNumber"
                value={formData.contactNumber}
                onChange={(event) => handleFieldChange('contactNumber', event.target.value)}
                placeholder="Enter contact number"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button className="w-full bg-green-600 hover:bg-green-700" type="submit">
              Save and Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfilePage;
