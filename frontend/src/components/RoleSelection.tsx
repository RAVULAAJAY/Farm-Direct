import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from 'lucide-react';
import { UserRole } from '@/context/AuthContext';
import BrandLogo from '@/components/BrandLogo';

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
  onBack: () => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole, onBack }) => {
  const roles: { id: UserRole; label: string; emoji: string; description: string; color: string; benefits: string[] }[] = [
    {
      id: 'farmer',
      label: 'Farmer',
      emoji: '🧑‍🌾',
      description: 'Sell your crops directly to buyers',
      color: 'green',
      benefits: [
        'Set your own prices',
        'Direct buyer contact',
        'Real-time order tracking',
        'Build long-term relationships'
      ]
    },
    {
      id: 'buyer',
      label: 'Buyer',
      emoji: '🧑‍💼',
      description: 'Buy fresh produce from local farmers',
      color: 'blue',
      benefits: [
        'Fresh farm produce',
        'Better prices',
        'Direct farmer communication',
        'Quality assurance'
      ]
    },
    {
      id: 'admin',
      label: 'Admin',
      emoji: '🔐',
      description: 'Platform administration',
      color: 'purple',
      benefits: [
        'User management',
        'Platform analytics',
        'Listing approvals',
        'System configuration'
      ]
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#edf9f4] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_26%),linear-gradient(to_bottom,rgba(255,255,255,0.92),rgba(237,249,244,1))]" />
      <div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-emerald-200/45 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl animate-float" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-teal-200/35 blur-3xl animate-pulse-soft" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onBack}
              className="rounded-full border border-white/70 bg-white/70 px-4 py-2 text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </div>

          <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-white/80 bg-white/75 px-6 py-12 text-center shadow-[0_30px_90px_-35px_rgba(15,23,42,0.34)] backdrop-blur-2xl animate-fade-in-scale sm:px-10">
            <div className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
            <BrandLogo
              className="justify-center mb-3"
              imageClassName="h-10 w-10 sm:h-12 sm:w-12"
              textClassName="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900"
            />
            <p className="mx-auto max-w-3xl text-lg text-slate-600">
              Choose your role to continue
            </p>
          </div>
        </div>

        {/* Role Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {roles.map((role) => (
            <Card 
              key={role.id}
              className={`group overflow-hidden rounded-[1.75rem] border bg-white/90 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.38)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_28px_80px_-34px_rgba(15,23,42,0.45)] ${role.id === 'farmer' ? 'border-emerald-100' : role.id === 'buyer' ? 'border-sky-100' : 'border-violet-100'}`}
            >
              <div className={`h-1 ${role.id === 'farmer' ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : role.id === 'buyer' ? 'bg-gradient-to-r from-sky-500 to-cyan-300' : 'bg-gradient-to-r from-violet-500 to-fuchsia-300'}`} />
              <CardHeader className="pb-4 pt-8 text-center">
                <div className="mb-4 text-5xl transition-transform duration-300 group-hover:scale-110">{role.emoji}</div>
                <CardTitle className={`text-2xl ${role.id === 'farmer' ? 'text-emerald-700' : role.id === 'buyer' ? 'text-sky-700' : 'text-violet-700'}`}>
                  {role.label}
                </CardTitle>
                <CardDescription className="text-slate-600">
                  {role.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-5 px-6 pb-7">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Key Benefits:</p>
                  <ul className="space-y-2">
                    {role.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className={`font-bold text-lg leading-none ${role.id === 'farmer' ? 'text-emerald-500' : role.id === 'buyer' ? 'text-sky-500' : 'text-violet-500'}`}>✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {role.id === 'admin' && (
                  <Button
                    onClick={() => onSelectRole(role.id)}
                    className="h-auto w-full rounded-full bg-violet-600 py-3 text-lg font-semibold text-white shadow-md shadow-violet-600/20 transition-all duration-300 hover:-translate-y-1 hover:bg-violet-700 hover:shadow-violet-600/30"
                  >
                    Admin Login
                  </Button>
                )}
                
                {role.id !== 'admin' && (
                  <Button 
                    onClick={() => onSelectRole(role.id)}
                    className={`h-auto w-full rounded-full py-3 text-lg font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-1 ${role.id === 'farmer' ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-600/30' : 'bg-sky-600 shadow-sky-600/20 hover:bg-sky-700 hover:shadow-sky-600/30'}`}
                  >
                    Sign In as {role.label}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <Card className="rounded-[2rem] border border-white/80 bg-white/78 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <CardContent className="pt-6 pb-6">
            <div className="flex gap-4">
              <div className="text-2xl">ℹ️</div>
              <div>
                <h3 className="mb-2 font-semibold text-slate-900">New to FarmDirect?</h3>
                <p className="text-sm leading-6 text-slate-600">
                  On the next screen, you'll have the option to create a new account. Choose the same role you're signing in with, and we'll guide you through the registration process.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
