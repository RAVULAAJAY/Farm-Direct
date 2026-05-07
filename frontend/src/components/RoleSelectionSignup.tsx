import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from 'lucide-react';
import { UserRole } from '@/context/AuthContext';
import BrandLogo from '@/components/BrandLogo';

interface RoleSelectionSignupProps {
  onSelectRole: (role: UserRole) => void;
  onBack: () => void;
}

const RoleSelectionSignup: React.FC<RoleSelectionSignupProps> = ({ onSelectRole, onBack }) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#edf9f4] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_26%),linear-gradient(to_bottom,rgba(255,255,255,0.92),rgba(237,249,244,1))]" />
      <div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-emerald-200/45 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl animate-float" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-teal-200/35 blur-3xl animate-pulse-soft" />

      {/* Header */}
      <div className="relative z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 rounded-full border border-transparent bg-white/70 px-4 py-2 text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-white/80 bg-white/75 px-6 py-12 text-center shadow-[0_30px_90px_-35px_rgba(15,23,42,0.34)] backdrop-blur-2xl animate-fade-in-scale sm:px-10">
            <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
            <BrandLogo
              className="justify-center mb-4"
              imageClassName="h-10 w-10 sm:h-12 sm:w-12"
              textClassName="text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl"
            />
            <p className="mx-auto mb-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
              Create an account and start connecting directly with farmers or buyers.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-emerald-700 shadow-[0_12px_30px_-18px_rgba(16,185,129,0.55)]">
              <span className="text-sm font-medium">Create one account. Reach the right market.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Selection Cards */}
      <div className="relative z-10 px-4 pb-16 mx-auto max-w-6xl sm:px-6">
        <div className="text-center mb-12">
          <h2 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900">Choose Your Role to Sign Up</h2>
          <p className="text-slate-600">Select the role that best fits your needs</p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Farmer Card */}
          <Card className="group overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white/90 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.38)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_28px_80px_-34px_rgba(15,23,42,0.45)]">
            <div className="h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
            <CardHeader className="pb-4 pt-8 text-center">
              <div className="mb-4 text-6xl transition-transform duration-300 group-hover:scale-110">🧑‍🌾</div>
              <CardTitle className="text-2xl text-emerald-700">I'm a Farmer</CardTitle>
              <CardDescription className="text-base text-slate-600">
                Sell your crops directly to buyers without intermediaries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-7">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl mt-0.5">✓</span>
                  <span className="text-slate-700">
                    <strong>Direct Sales:</strong> List your crops with photos and reach buyers directly
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl mt-0.5">✓</span>
                  <span className="text-slate-700">
                    <strong>Set Prices:</strong> Control your pricing to maximize profits
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl mt-0.5">✓</span>
                  <span className="text-slate-700">
                    <strong>Chat with Buyers:</strong> Direct communication channel with potential customers
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl mt-0.5">✓</span>
                  <span className="text-slate-700">
                    <strong>Order Tracking:</strong> Monitor all your orders in real-time
                  </span>
                </li>
              </ul>
              <Button 
                onClick={() => onSelectRole('farmer')}
                className="h-auto w-full rounded-full bg-emerald-600 py-3 text-lg font-semibold text-white shadow-md shadow-emerald-600/20 transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-700 hover:shadow-emerald-600/30"
              >
                Sign Up as Farmer
              </Button>
            </CardContent>
          </Card>

          {/* Buyer Card */}
          <Card className="group overflow-hidden rounded-[1.75rem] border border-sky-100 bg-white/90 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.38)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_28px_80px_-34px_rgba(15,23,42,0.45)]">
            <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <CardHeader className="pb-4 pt-8 text-center">
              <div className="mb-4 text-6xl transition-transform duration-300 group-hover:scale-110">🧑‍💼</div>
              <CardTitle className="text-2xl text-sky-700">I'm a Buyer</CardTitle>
              <CardDescription className="text-base text-slate-600">
                Buy fresh produce directly from local farmers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-7">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl mt-0.5">✓</span>
                  <span className="text-slate-700">
                    <strong>Fresh Produce:</strong> Browse farm-fresh vegetables and fruits
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl mt-0.5">✓</span>
                  <span className="text-slate-700">
                    <strong>Better Prices:</strong> Direct sourcing eliminates middlemen markups
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl mt-0.5">✓</span>
                  <span className="text-slate-700">
                    <strong>Compare & Select:</strong> Review quality and pricing from multiple farmers
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl mt-0.5">✓</span>
                  <span className="text-slate-700">
                    <strong>Flexible Options:</strong> Multiple payment methods for your convenience
                  </span>
                </li>
              </ul>
              <Button 
                onClick={() => onSelectRole('buyer')}
                className="h-auto w-full rounded-full bg-sky-600 py-3 text-lg font-semibold text-white shadow-md shadow-sky-600/20 transition-all duration-300 hover:-translate-y-1 hover:bg-sky-700 hover:shadow-sky-600/30"
              >
                Sign Up as Buyer
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <Card className="rounded-[2rem] border border-white/80 bg-white/78 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-center text-emerald-700">Why Choose FarmDirect?</CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-6 text-center shadow-sm transition-transform duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-3">💰</div>
                <h4 className="mb-2 font-semibold text-slate-900">Fair Prices</h4>
                <p className="text-sm text-slate-600">No middlemen means better prices for both farmers and buyers</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-6 text-center shadow-sm transition-transform duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-3">🌱</div>
                <h4 className="mb-2 font-semibold text-slate-900">Fresh Produce</h4>
                <p className="text-sm text-slate-600">Direct from farm to your table, guaranteed freshness</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-6 text-center shadow-sm transition-transform duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-3">🤝</div>
                <h4 className="mb-2 font-semibold text-slate-900">Community</h4>
                <p className="text-sm text-slate-600">Build meaningful relationships between farmers and buyers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleSelectionSignup;
