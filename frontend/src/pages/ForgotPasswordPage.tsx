import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { requestPasswordReset } from '@/lib/api';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [debugLink, setDebugLink] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDebugLink('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset(email.trim().toLowerCase());
      if (res?.debugLink) {
        setDebugLink(res.debugLink);
      }
      setSuccess('If an account exists for this email, a reset link has been sent.');
    } catch (err: any) {
      setError(err?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">Enter your account email and we'll send a secure link to reset your password.</p>
          {error && (
            <Alert className="border-red-200 bg-red-50 text-red-800 mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2" />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>Cancel</Button>
            </div>
          </form>

          {debugLink && (
            <div className="mt-4 text-sm">
              <div className="text-gray-700">Debug reset link (development only):</div>
              <a href={debugLink} className="text-blue-600 break-all" target="_blank" rel="noreferrer">{debugLink}</a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
