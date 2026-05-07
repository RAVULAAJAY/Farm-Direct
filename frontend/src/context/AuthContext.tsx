import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGlobalState,
  type AuthMode,
  type User,
  type UserRole,
} from '@/context/GlobalStateContext';

export type { AuthMode, User, UserRole } from '@/context/GlobalStateContext';

export const isProfileComplete = (user: User): boolean => {
  if (user.role !== 'farmer') {
    return true;
  }

  const hasCropTypes = (user.cropTypes ?? []).map((crop) => crop.trim()).filter(Boolean).length > 0;

  return (
    user.name.trim().length > 0 &&
    (user.farmName ?? '').trim().length > 0 &&
    user.location.trim().length > 0 &&
    user.phone.trim().length > 0 &&
    hasCropTypes
  );
};

export const hasFarmerPaymentDetails = (user: User): boolean => {
  if (user.role !== 'farmer') {
    return true;
  }

  return (
    (user.paymentDetails?.bankName ?? '').trim().length > 0 &&
    (user.paymentDetails?.accountNumber ?? '').trim().length > 0 &&
    (user.paymentDetails?.ifscOrUpi ?? '').trim().length > 0
  );
};

export const hasBuyerPaymentDetails = (user: User): boolean => {
  if (user.role !== 'buyer') {
    return true;
  }

  return (
    (user.paymentDetails?.bankName ?? '').trim().length > 0 &&
    (user.paymentDetails?.accountNumber ?? '').trim().length > 0 &&
    (user.paymentDetails?.ifscOrUpi ?? '').trim().length > 0
  );
};

export interface AuthContextType {
  currentUser: User | null;
  selectedRole: UserRole | null;
  authMode: AuthMode;
  isLoading: boolean;
  login: (user: User) => void;
  signup: (user: User) => void;
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
  setSelectedRole: (role: UserRole | null) => void;
  setAuthMode: (mode: AuthMode) => void;
  setIsLoading: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const {
    currentUser,
    selectedRole,
    login,
    signup,
    logout: clearGlobalAuth,
    setCurrentUser,
    setSelectedRole,
  } = useGlobalState();

  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(() => {
    clearGlobalAuth();
    setAuthMode(null);
    navigate('/', { replace: true });
  }, [clearGlobalAuth, navigate]);

  const value: AuthContextType = {
    currentUser,
    selectedRole,
    authMode,
    isLoading,
    login,
    signup,
    logout,
    setCurrentUser,
    setSelectedRole,
    setAuthMode,
    setIsLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
