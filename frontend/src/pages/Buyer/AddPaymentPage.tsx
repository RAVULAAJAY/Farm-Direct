import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';

interface AddPaymentPageProps {
  user: User;
}

const AddPaymentPage: React.FC<AddPaymentPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useGlobalState();
  const [formData, setFormData] = useState({
    bankName: user.paymentDetails?.bankName ?? '',
    accountNumber: user.paymentDetails?.accountNumber ?? '',
    ifscOrUpi: user.paymentDetails?.ifscOrUpi ?? '',
  });
  const [error, setError] = useState('');

  const showBlockedWarning = searchParams.get('warning') === 'payment-required';
  const nextPath = searchParams.get('next') || '/buyer/dashboard';

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const isValid =
      formData.bankName.trim().length > 0 &&
      formData.accountNumber.trim().length > 0 &&
      formData.ifscOrUpi.trim().length > 0;

    if (!isValid) {
      setError('Please fill all payment fields before continuing.');
      return;
    }

    updateUser(user.id, {
      paymentDetails: {
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifscOrUpi: formData.ifscOrUpi.trim(),
      },
    });

    navigate(nextPath, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-xl py-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Payment</CardTitle>
          <CardDescription>
            Add payment details to place orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showBlockedWarning && (
            <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-900">
              <AlertDescription>
                Add payment details to continue.
              </AlertDescription>
            </Alert>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(event) => handleChange('bankName', event.target.value)}
                placeholder="Enter bank name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account number</Label>
              <Input
                id="accountNumber"
                value={formData.accountNumber}
                onChange={(event) => handleChange('accountNumber', event.target.value)}
                placeholder="Enter account number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifscOrUpi">IFSC / UPI</Label>
              <Input
                id="ifscOrUpi"
                value={formData.ifscOrUpi}
                onChange={(event) => handleChange('ifscOrUpi', event.target.value)}
                placeholder="Enter IFSC code or UPI ID"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button className="w-full bg-green-600 hover:bg-green-700" type="submit">
              Save Payment Details
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddPaymentPage;
