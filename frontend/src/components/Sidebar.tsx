import React from 'react';
import {
  Home,
  ShoppingCart,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Users,
  Zap,
  Heart,
  LayoutDashboard,
  MessageCircle,
  CreditCard,
  MapPin,
  Star,
  Truck,
  Bell,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserType } from '@/context/AuthContext';
import BrandLogo from '@/components/BrandLogo';

interface SidebarProps {
  user: UserType;
  onLogout: () => void;
  onNavigate?: (path: string) => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  currentPath?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  onLogout,
  onNavigate,
  isOpen = true,
  onToggle,
  currentPath = ''
}): React.ReactNode => {
  const isFarmer = user.role === 'farmer';
  const isBuyer = user.role === 'buyer';
  const isAdmin = user.role === 'admin';
  const paymentPath = isFarmer ? '/farmer/payments' : isBuyer ? '/checkout' : '/payment';
  const paymentLabel = isFarmer ? 'Payments' : 'Checkout';

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'farmer': return { bg: 'from-green-50 to-emerald-50', text: 'text-green-700', accent: 'bg-green-100', border: 'border-green-600' };
      case 'buyer': return { bg: 'from-blue-50 to-cyan-50', text: 'text-blue-700', accent: 'bg-blue-100', border: 'border-blue-600' };
      case 'admin': return { bg: 'from-purple-50 to-pink-50', text: 'text-purple-700', accent: 'bg-purple-100', border: 'border-purple-600' };
      default: return { bg: 'from-gray-50 to-slate-50', text: 'text-gray-700', accent: 'bg-gray-100', border: 'border-gray-600' };
    }
  };

  const getRoleEmoji = (role: string) => {
    switch(role) {
      case 'farmer': return '🧑‍🌾';
      case 'buyer': return '🧑‍💼';
      case 'admin': return '🔐';
      default: return '👤';
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', show: true },
    { icon: BarChart3, label: 'Farm Dashboard', path: '/farmer/dashboard', show: isFarmer },
    { icon: BarChart3, label: 'Orders Received', path: '/orders', show: isFarmer },
    { icon: BarChart3, label: 'Buyer Dashboard', path: '/buyer/dashboard', show: isBuyer },
    { icon: ShoppingCart, label: 'Browse Listings', path: '/browse', show: isBuyer },
    { icon: ShoppingCart, label: 'My Cart', path: '/cart', show: isBuyer },
    { icon: Wallet, label: 'Checkout', path: '/checkout', show: isBuyer },
    { icon: Heart, label: 'Saved Items', path: '/favorites', show: isBuyer },
    { icon: BarChart3, label: 'My Orders', path: '/orders', show: isBuyer },
    { icon: Users, label: 'Users', path: '/admin/dashboard?tab=users', show: isAdmin },
    { icon: ShoppingCart, label: 'Listings', path: '/admin/dashboard?tab=products', show: isAdmin },
    { icon: BarChart3, label: 'Reports', path: '/admin/dashboard?tab=orders', show: isAdmin },
    { icon: MessageSquare, label: 'Messages', path: '/messages', show: true },
    { icon: MapPin, label: 'Find Farmers', path: '/locations', show: true },
    { icon: CreditCard, label: paymentLabel, path: paymentPath, show: isFarmer || isBuyer },
    { icon: Star, label: 'Ratings & Reviews', path: '/ratings', show: true },
    { icon: Truck, label: 'Delivery', path: '/delivery', show: true },
    { icon: Bell, label: 'Notifications', path: '/notifications', show: true },
  ];

  const filteredItems = navItems.filter((item) => item.show);

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const isActive = (path: string) => {
    if (!currentPath) {
      return false;
    }

    if (currentPath === path) {
      return true;
    }

    return path !== '/' && currentPath.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {!isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in duration-200"
          onClick={() => onToggle && onToggle(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative w-64 h-full bg-gradient-to-b from-white via-gray-50 to-white border-r border-gray-100 backdrop-blur-sm z-40 transition-all duration-300 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col overflow-y-auto scroll-smooth">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <BrandLogo
                imageClassName="h-9 w-9 transform transition-transform group-hover:scale-110"
                textClassName="font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
              />
            </div>
            <button
              onClick={() => onToggle && onToggle(false)}
              className="md:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info - Modern Card */}
          <div className={`m-4 p-4 bg-gradient-to-br ${getRoleColor(user.role).bg} border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300`}>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={user.profilePhoto} alt={user.name} />
                <AvatarFallback className="text-xl bg-white/80">{getRoleEmoji(user.role)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                <p className={`text-xs font-medium capitalize ${getRoleColor(user.role).text}`}>
                  {user.role}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {filteredItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const roleColors = getRoleColor(user.role);
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  style={{
                    animationDelay: `${index * 30}ms`,
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-left group ${
                    active
                      ? `${roleColors.accent} ${roleColors.text} font-semibold shadow-md border-l-4 ${roleColors.border}`
                      : 'text-gray-700 hover:bg-gray-100 font-medium'
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 transform transition-transform group-hover:scale-110 ${active ? '' : 'group-hover:translate-x-1'}`} />
                  <span className="text-sm flex-1">{item.label}</span>
                  {active && <ChevronRight className="h-4 w-4 ml-auto animate-in slide-in-from-left" />}
                </button>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-gray-100 space-y-1">
            <button
              onClick={() => handleNavigate('/profile')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-green-50 hover:text-green-700 font-medium transition-all duration-200 group"
            >
              <Users className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="text-sm flex-1">Profile</span>
            </button>
            <button
              onClick={() => handleNavigate('/settings')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-all duration-200 group"
            >
              <Settings className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="text-sm flex-1">Settings</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 font-medium transition-all duration-200 group"
            >
              <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="text-sm flex-1">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
