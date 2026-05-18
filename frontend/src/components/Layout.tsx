import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import useNotifications from '@/hooks/useNotifications';
import { User as UserType } from '@/context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  user: UserType;
  onLogout: () => void;
  currentPath?: string;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  user,
  onLogout,
  currentPath = '',
  children
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const activePath = currentPath && currentPath !== '' ? currentPath : `${location.pathname}${location.search}`;

  useNotifications();

  return (
    <div className="flex min-h-dvh w-full overflow-hidden bg-gradient-to-br from-white via-green-50 to-blue-50">
      {/* Sidebar - Hidden on small screens */}
      <div className="hidden md:block shadow-lg">
        <Sidebar
          user={user}
          onLogout={onLogout}
          onNavigate={handleNavigate}
          isOpen={true}
          currentPath={activePath}
        />
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sidebar
          user={user}
          onLogout={onLogout}
          onNavigate={handleNavigate}
          isOpen={sidebarOpen}
          onToggle={setSidebarOpen}
          currentPath={activePath}
        />
      </div>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar
          user={user}
          onLogout={onLogout}
          onNavigate={handleNavigate}
          isMobile={false}
          onMenuToggle={setSidebarOpen}
        />

        {/* Page Content - with smooth scroll and animations */}
        <main className="min-w-0 flex-1 overflow-y-auto scroll-smooth">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 animate-in fade-in duration-500 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
