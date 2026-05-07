import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Home,
  ShoppingCart,
  MessageSquare,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Search,
  Wallet
} from 'lucide-react';
import { User as UserType } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationBell, { Notification } from '@/components/Notifications/NotificationBell';
import { useGlobalState } from '@/context/GlobalStateContext';
import BrandLogo from '@/components/BrandLogo';

interface NavbarProps {
  user: UserType;
  onLogout: () => void;
  onNavigate?: (path: string) => void;
  isMobile?: boolean;
  onMenuToggle?: (open: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onNavigate,
  isMobile = false,
  onMenuToggle
}) => {
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const {
    currentUser,
    getNotificationsByUser,
    markNotificationAsRead,
    deleteNotification,
    clearNotificationsForUser,
  } = useGlobalState();
  const navigate = useNavigate();

  const notifications = currentUser ? getNotificationsByUser(currentUser.id) : [];

  const getRoleEmoji = (role: string) => {
    switch(role) {
      case 'farmer': return '🧑‍🌾';
      case 'buyer': return '🧑‍💼';
      case 'admin': return '🔐';
      default: return '👤';
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'farmer': return 'green';
      case 'buyer': return 'blue';
      case 'admin': return 'purple';
      default: return 'gray';
    }
  };

  const handleLogout = () => {
    setOpenUserMenu(false);
    onLogout();
  };

  const handleNavigate = (path: string) => {
    setOpenUserMenu(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      handleNavigate(notification.actionUrl);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  const handleDeleteNotification = (notificationId: string) => {
    deleteNotification(notificationId);
  };

  const handleClearAll = () => {
    if (currentUser) {
      clearNotificationsForUser(currentUser.id);
    }
  };

  return (
    <nav className={`bg-gradient-to-r from-white via-green-50 to-white border-b border-gray-100 backdrop-blur-md bg-opacity-95 sticky top-0 z-40 shadow-sm transition-shadow duration-300 ${isMobile ? 'px-4' : 'px-6'}`}>
      <div className="max-w-full mx-auto flex items-center justify-between h-16">
        {/* Logo and Brand - with animation */}
        <div className="flex items-center gap-3 flex-shrink-0 group cursor-pointer hover:opacity-80 transition-opacity">
          <BrandLogo
            imageClassName="h-9 w-9 transform transition-transform duration-300 group-hover:scale-110"
            textClassName="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent hidden sm:inline"
          />
        </div>

        {/* Central Search - Hidden on mobile */}
        {!isMobile && (
          <div className="flex-1 max-w-md mx-8 hidden lg:block">
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-green-500 transition-colors" />
              <input
                type="text"
                placeholder="Search crops, farmers..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:bg-white transition-all duration-200 text-sm"
              />
            </div>
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Notifications - Desktop only */}
          <div className="hidden sm:block transition-transform duration-300 hover:scale-110">
            <NotificationBell
              notifications={notifications}
              onNotificationClick={handleNotificationClick}
              onMarkAsRead={handleMarkAsRead}
              onDeleteNotification={handleDeleteNotification}
              onClearAll={handleClearAll}
            />
          </div>

          {/* Messages - Desktop only */}
          <button
            onClick={() => handleNavigate('/messages')}
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gradient-to-br hover:from-blue-100 hover:to-blue-50 text-gray-600 hover:text-blue-600 transition-all duration-200 group"
          >
            <MessageSquare className="h-5 w-5 group-hover:scale-110 transition-transform" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setOpenUserMenu(!openUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 group"
            >
              <div className="text-lg transform group-hover:scale-110 transition-transform">{getRoleEmoji(user.role)}</div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-600 capitalize">{user.role}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-600 transform transition-transform duration-300 ${openUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu - with animation */}
            {openUserMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Info */}
                <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50 rounded-t-xl">
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <div className="mt-2 inline-block px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-700 capitalize">
                    {user.role}
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    onClick={() => handleNavigate('/profile')}
                    className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-3 text-sm transition-all duration-150 group"
                  >
                    <User className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    View Profile
                  </button>

                  <button
                    onClick={() => handleNavigate('/settings')}
                    className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 text-sm transition-all duration-150 group"
                  >
                    <Settings className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    Settings
                  </button>

                  {/* Role-specific items */}
                  {user.role === 'farmer' && (
                    <>
                      <button
                        onClick={() => handleNavigate('/my-listings')}
                        className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-3 text-sm transition-all duration-150 group"
                      >
                        <ShoppingCart className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        My Listings
                      </button>
                      <button
                        onClick={() => handleNavigate('/orders')}
                        className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-3 text-sm transition-all duration-150 group"
                      >
                        <Home className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        Orders Received
                      </button>
                    </>
                  )}

                  {user.role === 'buyer' && (
                    <>
                      <button
                        onClick={() => handleNavigate('/browse')}
                        className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 text-sm transition-all duration-150 group"
                      >
                        <ShoppingCart className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        Browse Listings
                      </button>
                      <button
                        onClick={() => handleNavigate('/cart')}
                        className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 text-sm transition-all duration-150 group"
                      >
                        <ShoppingCart className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        My Cart
                      </button>
                      <button
                        onClick={() => handleNavigate('/checkout')}
                        className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-3 text-sm transition-all duration-150 group"
                      >
                        <Wallet className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        Checkout
                      </button>
                      <button
                        onClick={() => handleNavigate('/orders')}
                        className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-3 text-sm transition-all duration-150 group"
                      >
                        <ShoppingCart className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        My Orders
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleNavigate('/messages')}
                    className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-3 text-sm transition-all duration-150 group"
                  >
                    <MessageSquare className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    Messages
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-3 text-sm font-medium transition-all duration-150 group"
                  >
                    <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => onMenuToggle && onMenuToggle(true)}
            className="md:hidden p-2 text-gray-600 hover:bg-gradient-to-br hover:from-green-100 hover:to-emerald-100 text-gray-600 hover:text-green-700 rounded-xl transition-all duration-200 group"
          >
            <Menu className="h-6 w-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
