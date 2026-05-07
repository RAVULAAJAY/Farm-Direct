import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-white via-green-50 to-blue-50 overflow-hidden">
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
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navbar */}
        <Navbar
          user={user}
          onLogout={onLogout}
          onNavigate={handleNavigate}
          isMobile={false}
          onMenuToggle={setSidebarOpen}
        />

        {/* Page Content - with smooth scroll and animations */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
