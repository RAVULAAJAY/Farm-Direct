
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isProfileComplete, useAuth, UserRole, type User } from '@/context/AuthContext';
import EnhancedAuthForm from '@/components/EnhancedAuthForm';
import BrandLogo from '@/components/BrandLogo';
import RoleSelection from '@/components/RoleSelection';
import RoleSelectionSignup from '@/components/RoleSelectionSignup';

type ViewState = 'home' | 'role-selection-signup' | 'role-selection-login' | 'auth-form';

// Helper function to get dashboard path based on role
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

const Index = () => {
  const navigate = useNavigate();
  const { currentUser, selectedRole, setCurrentUser, setSelectedRole, logout } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('home');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Check if user is already logged in - redirect to role-specific dashboard
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'farmer' && !isProfileComplete(currentUser)) {
        navigate('/complete-profile', { replace: true });
        return;
      }

      const dashboardPath = getDashboardPath(currentUser.role);
      navigate(dashboardPath, { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSignupRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setAuthMode('signup');
    setViewState('auth-form');
  };

  const handleLoginRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setAuthMode('login');
    setViewState('auth-form');
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    // Navigation will be handled by the useEffect above
  };

  const handleBackFromAuth = () => {
    setSelectedRole(null);
    setViewState('role-selection-signup');
  };

  const handleBackToHome = () => {
    setSelectedRole(null);
    setViewState('home');
  };

  const handleLogout = () => {
    logout();
    setViewState('home');
    setSelectedRole(null);
  };

  // Auth form view
  if (viewState === 'auth-form' && selectedRole) {
    return (
      <EnhancedAuthForm
        role={selectedRole}
        mode={authMode}
        onSuccess={handleAuthSuccess}
        onBack={handleBackFromAuth}
        onModeChange={(mode) => setAuthMode(mode)}
      />
    );
  }

  // Role selection for signup
  if (viewState === 'role-selection-signup') {
    return (
      <RoleSelectionSignup
        onSelectRole={handleSignupRoleSelect}
        onBack={handleBackToHome}
      />
    );
  }

  // Role selection for login
  if (viewState === 'role-selection-login') {
    return (
      <RoleSelection
        onSelectRole={handleLoginRoleSelect}
        onBack={handleBackToHome}
      />
    );
  }

  // Home view - Main landing page
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f8f4] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_22%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.08),transparent_30%),linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(245,248,244,1))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 via-sky-400/60 to-transparent" />

      <div className="relative z-10 mx-auto max-w-[1240px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <div className="space-y-8 lg:space-y-10">
          <div className="rounded-[2rem] border border-white/80 bg-white/86 px-6 py-12 text-center shadow-[0_28px_90px_-38px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:px-10 lg:px-14 lg:py-14">
            <div className="mx-auto mb-6 h-px w-32 bg-gradient-to-r from-transparent via-emerald-500 via-sky-500 to-transparent" />
            <BrandLogo
              className="justify-center gap-5 sm:gap-6"
              imageClassName="h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36"
              textClassName="text-[clamp(2.75rem,5.4vw,4.6rem)] leading-none"
            />
            <p className="mx-auto mt-4 max-w-3xl text-[clamp(1rem,2vw,1.2rem)] leading-8 text-slate-600 sm:leading-9">
              Connecting farmers directly with buyers for fair prices and fresh produce, without middlemen.
            </p>
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-emerald-800 shadow-[0_14px_34px_-22px_rgba(16,185,129,0.6)]">
              <span className="text-sm font-medium">🚀 Empowering Rural Communities</span>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/86 px-5 py-8 shadow-[0_22px_70px_-36px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:px-8 lg:px-10 lg:py-9">
            <div className="text-center">
              <h2 className="text-[clamp(1.8rem,3vw,2.45rem)] font-semibold tracking-tight text-slate-900">Get Started Today</h2>
              <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <Button
                  onClick={() => setViewState('role-selection-signup')}
                  className="h-auto rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-3.5 text-base font-semibold text-white shadow-[0_16px_36px_-18px_rgba(16,185,129,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-emerald-600 hover:shadow-[0_18px_40px_-18px_rgba(16,185,129,0.95)] sm:text-lg"
                >
                  Create Account
                </Button>
                <Button
                  onClick={() => setViewState('role-selection-login')}
                  variant="outline"
                  className="h-auto rounded-full border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 sm:text-lg"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => {
                    setSelectedRole('admin');
                    setAuthMode('login');
                    setViewState('auth-form');
                  }}
                  variant="outline"
                  className="h-auto rounded-full border-sky-200 bg-white px-8 py-3.5 text-base font-semibold text-sky-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 sm:text-lg"
                >
                  Admin Login
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-[clamp(1.8rem,3vw,2.45rem)] font-semibold tracking-tight text-slate-900">Choose Your Role</h2>
              <p className="mt-3 text-slate-600">Join our marketplace as a farmer or buyer.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:gap-8">
              <Card className="group h-full overflow-hidden rounded-[1.75rem] border border-emerald-100/80 bg-white shadow-[0_22px_70px_-40px_rgba(15,23,42,0.28)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_85px_-42px_rgba(15,23,42,0.34)]">
                <div className="h-1 bg-gradient-to-r from-emerald-600 via-lime-400 to-emerald-300" />
                <CardHeader className="flex min-h-[170px] flex-col pb-4 pt-8 text-center sm:pt-9">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-3xl shadow-sm transition-transform duration-300 group-hover:scale-105">🧑‍🌾</div>
                  <CardTitle className="text-2xl font-semibold text-slate-900">I'm a Farmer</CardTitle>
                  <CardDescription className="mx-auto min-h-[56px] max-w-sm text-base leading-7 text-slate-600">
                    Sell your crops directly to buyers without intermediaries.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex h-full flex-col px-6 pb-7 sm:px-7">
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">✓</span>
                      <span>List your crops with photos</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">✓</span>
                      <span>Set your own prices</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">✓</span>
                      <span>Chat directly with buyers</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">✓</span>
                      <span>Track your orders</span>
                    </li>
                  </ul>
                  <Button
                    onClick={() => handleSignupRoleSelect('farmer')}
                    className="mt-7 h-auto w-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 py-3.5 text-base font-semibold text-white shadow-[0_16px_36px_-20px_rgba(16,185,129,0.75)] transition-all duration-300 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-emerald-600 hover:shadow-[0_18px_40px_-20px_rgba(16,185,129,0.92)] sm:text-lg"
                  >
                    Join as Farmer
                  </Button>
                </CardContent>
              </Card>

              <Card className="group h-full overflow-hidden rounded-[1.75rem] border border-sky-100/80 bg-white shadow-[0_22px_70px_-40px_rgba(15,23,42,0.28)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_85px_-42px_rgba(15,23,42,0.34)]">
                <div className="h-1 bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-300" />
                <CardHeader className="flex min-h-[170px] flex-col pb-4 pt-8 text-center sm:pt-9">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-3xl shadow-sm transition-transform duration-300 group-hover:scale-105">🧑‍💼</div>
                  <CardTitle className="text-2xl font-semibold text-slate-900">I'm a Buyer</CardTitle>
                  <CardDescription className="mx-auto min-h-[56px] max-w-sm text-base leading-7 text-slate-600">
                    Buy fresh produce directly from local farmers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex h-full flex-col px-6 pb-7 sm:px-7">
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">✓</span>
                      <span>Browse fresh local produce</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">✓</span>
                      <span>Compare prices & quality</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">✓</span>
                      <span>Chat with farmers</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">✓</span>
                      <span>Flexible payment options</span>
                    </li>
                  </ul>
                  <Button
                    onClick={() => handleSignupRoleSelect('buyer')}
                    className="mt-7 h-auto w-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 py-3.5 text-base font-semibold text-white shadow-[0_16px_36px_-20px_rgba(14,165,233,0.75)] transition-all duration-300 hover:-translate-y-0.5 hover:from-sky-500 hover:to-cyan-600 hover:shadow-[0_18px_40px_-20px_rgba(14,165,233,0.92)] sm:text-lg"
                  >
                    Join as Buyer
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] bg-gradient-to-b from-white/75 to-slate-50/90 px-4 py-16 shadow-[0_24px_80px_-44px_rgba(15,23,42,0.18)] ring-1 ring-white/60 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-[clamp(1.75rem,2.8vw,2.35rem)] font-semibold tracking-tight text-slate-900">Why Choose FarmDirect?</h3>
            <p className="mt-3 text-slate-600">A simple, trusted way to connect farmers and buyers.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3 xl:gap-8">
            <div className="group rounded-[1.5rem] border border-emerald-100/80 bg-white p-6 text-center shadow-[0_18px_60px_-36px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_70px_-36px_rgba(15,23,42,0.26)]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-3xl transition-transform duration-300 group-hover:scale-105">💰</div>
              <h4 className="mb-2 text-lg font-semibold text-slate-900">Fair Prices</h4>
              <p className="text-sm leading-6 text-slate-600">No middlemen means better prices for farmers and buyers</p>
            </div>
            <div className="group rounded-[1.5rem] border border-sky-100/80 bg-white p-6 text-center shadow-[0_18px_60px_-36px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_70px_-36px_rgba(15,23,42,0.26)]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-3xl transition-transform duration-300 group-hover:scale-105">🌱</div>
              <h4 className="mb-2 text-lg font-semibold text-slate-900">Fresh Produce</h4>
              <p className="text-sm leading-6 text-slate-600">Direct from farm to your table, ensuring maximum freshness</p>
            </div>
            <div className="group rounded-[1.5rem] border border-emerald-100/80 bg-white p-6 text-center shadow-[0_18px_60px_-36px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_70px_-36px_rgba(15,23,42,0.26)]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-3xl transition-transform duration-300 group-hover:scale-105">🤝</div>
              <h4 className="mb-2 text-lg font-semibold text-slate-900">Direct Connection</h4>
              <p className="text-sm leading-6 text-slate-600">Build relationships between farmers and buyers</p>
            </div>
          </div>
        </div>

        <div className="px-2 py-16 sm:px-0 lg:py-18">
          <div className="text-center">
            <h3 className="text-[clamp(1.75rem,2.8vw,2.35rem)] font-semibold tracking-tight text-slate-900">Security & Trust</h3>
            <p className="mx-auto mt-3 max-w-3xl text-slate-600">
              Your data is safe with us. We use industry-standard security practices to protect your information.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3 xl:gap-8">
            <Card className="group h-full border border-emerald-100/80 bg-white shadow-[0_18px_60px_-36px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_70px_-36px_rgba(15,23,42,0.26)]">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-3xl transition-transform duration-300 group-hover:scale-105">🔒</div>
                <CardTitle className="text-slate-900">Secure Accounts</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-slate-600">Strong password requirements and encrypted storage</p>
              </CardContent>
            </Card>
            <Card className="group h-full border border-sky-100/80 bg-white shadow-[0_18px_60px_-36px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_70px_-36px_rgba(15,23,42,0.26)]">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-3xl transition-transform duration-300 group-hover:scale-105">✓</div>
                <CardTitle className="text-slate-900">Verified Users</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-slate-600">All users verified for authentic connections</p>
              </CardContent>
            </Card>
            <Card className="group h-full border border-emerald-100/80 bg-white shadow-[0_18px_60px_-36px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_70px_-36px_rgba(15,23,42,0.26)]">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-3xl transition-transform duration-300 group-hover:scale-105">📱</div>
                <CardTitle className="text-slate-900">Privacy First</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-slate-600">Your personal information is never shared</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="border-t border-slate-200/80 py-5 text-center text-sm text-slate-600">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-4 py-2 font-medium text-slate-700 shadow-sm backdrop-blur-sm">
            Developed by <span className="ml-1 font-semibold text-emerald-700">Ravula Ajay</span>
          </span>
        </footer>
      </div>
    </div>
  );
};

export default Index;
