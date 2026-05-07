
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from 'lucide-react';
import type { User } from '@/context/AuthContext';
import { getAdminLoginEmail, hasAdminLoginCredentials, isAdminCredentialMatch } from '@/lib/adminAuth';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                placeholder="Enter your email"
              />
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
              />
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
              className={`w-full bg-${roleColor}-600 hover:bg-${roleColor}-700 text-white py-3`}
            >
              {effectiveMode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
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
