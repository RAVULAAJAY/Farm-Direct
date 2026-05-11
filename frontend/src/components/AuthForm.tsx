
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from 'lucide-react';
import type { User } from '@/context/AuthContext';
import { getAdminLoginEmail, hasAdminLoginCredentials, isAdminCredentialMatch } from '@/lib/adminAuth';
import * as api from '@/lib/api';

interface AuthFormProps {
  role: 'farmer' | 'buyer' | 'admin';
  mode: 'login' | 'signup';
  onSuccess: (user: User) => void;
  onBack: () => void;
  onModeChange: (mode: 'login' | 'signup') => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ role, mode, onSuccess, onBack, onModeChange }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    location: ''
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const submitForm = () => {
    console.debug('[AuthForm] submitForm called', { email: formData.email });
    if (mode === 'signup' && role !== 'admin' && !emailVerified) {
      window.alert('Please verify your email OTP before creating an account.');
      return;
    }

    if (role === 'admin') {
      if (!hasAdminLoginCredentials()) {
        return;
      }

      if (!isAdminCredentialMatch(formData.email, formData.password)) {
        return;
      }

      const adminUser = {
        id: 'admin_primary',
        name: 'Platform Admin',
        email: getAdminLoginEmail(),
        phone: '',
        location: 'HQ',
        role: 'admin',
      } as User;

      localStorage.setItem('currentUser', JSON.stringify(adminUser));
      onSuccess(adminUser);
      return;
    }

    // Simulate authentication - in real app this would connect to Firebase
    const user = {
      id: role === 'farmer' ? '1' : role === 'buyer' ? '2' : 'admin',
      name: formData.name || formData.email.split('@')[0],
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      role: role
    };
    
    // Store in localStorage for demo purposes
    localStorage.setItem('currentUser', JSON.stringify(user));
    onSuccess(user);
  };

  const handleSendOtp = async () => {
    if (!formData.email) return;
    setSendingOtp(true);
    try {
      await api.sendOtp(formData.email);
      setOtpSent(true);
      setEmailVerified(false);
      window.alert('OTP sent to email (check console if SMTP not configured).');
    } catch (e) {
      console.error('Failed to send OTP', e);
      window.alert('Unable to send OTP right now.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.email || !otp) return;
    setVerifyingOtp(true);
    try {
      await api.verifyOtp(formData.email, otp);
      setEmailVerified(true);
      window.alert('Email verified');
    } catch (e) {
      console.error('OTP verify failed', e);
      window.alert('Invalid or expired OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  const navigate = useNavigate();

  const roleEmoji = role === 'farmer' ? '🧑‍🌾' : role === 'buyer' ? '🧑‍💼' : '🔐';
  const roleColor = role === 'farmer' ? 'green' : role === 'buyer' ? 'blue' : 'purple';
  const effectiveMode = role === 'admin' ? 'login' : mode;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            onClick={onBack}
            className="absolute left-4 top-4 p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-4xl mb-2">{roleEmoji}</div>
          <CardTitle className={`text-2xl text-${roleColor}-700`}>
            {mode === 'login' ? 'Welcome Back' : 'Join as'} {role === 'farmer' ? 'Farmer' : 'Buyer'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' 
              ? 'Sign in to your account' 
              : `Create your ${role} account to get started`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              console.debug('[AuthForm] Enter pressed on form');
              submitForm();
            }
          }} className="space-y-4">
            {effectiveMode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Enter your full name"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({...formData, email: e.target.value});
                    if (emailVerified) setEmailVerified(false);
                    if (otpSent) setOtpSent(false);
                    if (otp) setOtp('');
                  }}
                  required
                  placeholder="Enter your email"
                />
                <Button type="button" onClick={handleSendOtp} disabled={sendingOtp} className="whitespace-nowrap">
                  {otpSent ? 'Resend OTP' : 'Send OTP'}
                </Button>
              </div>
              {otpSent && (
                <div className="mt-2 flex gap-2 items-center">
                  <Input placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
                  <Button type="button" onClick={handleVerifyOtp} disabled={verifyingOtp}>
                    Verify
                  </Button>
                  {emailVerified && <span className="text-sm text-green-600">Verified</span>}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                placeholder="Enter your password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitForm();
                  }
                }}
              />
              {effectiveMode === 'login' && role !== 'admin' && (
                <div className="text-right mt-2">
                  <Button type="button" variant="link" onClick={() => { console.debug('[AuthForm] forgot password clicked'); navigate('/forgot-password'); }} className="p-0 text-sm">Forgot password?</Button>
                </div>
              )}
            </div>
            
            {effectiveMode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                    placeholder={role === 'farmer' ? 'Your farm location' : 'Your delivery address'}
                  />
                </div>
              </>
            )}
            
            <Button 
              type="submit" 
              disabled={effectiveMode === 'signup' && !emailVerified}
              className={`w-full bg-${roleColor}-600 hover:bg-${roleColor}-700 text-white py-3`}
            >
              {effectiveMode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
            {effectiveMode === 'signup' && !emailVerified && (
              <p className="text-xs text-amber-700">Verify your email OTP to enable account creation.</p>
            )}
          </form>

          {role !== 'admin' && (
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              </p>
              <Button
                variant="link"
                onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}
                className={`text-${roleColor}-600 p-0`}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;
