import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthProvider, hasFarmerPaymentDetails, isProfileComplete, useAuth } from "./context/AuthContext";
import { GlobalStateProvider, useGlobalState } from "./context/GlobalStateContext";
import Layout from "./components/Layout";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import OrdersPage from "./pages/OrdersPage";
import MessagesPage from "./pages/MessagesPage";
import ChatListPage from "./pages/ChatPage";
import LocationPage from "./pages/LocationPage";
import RatingsPage from "./pages/RatingsPage";
import DeliveryPage from "./pages/DeliveryPage";
import NotificationsPage from "./pages/NotificationsPage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import MyListingsPage from "./pages/Farmer/MyListingsPage";
import AddPaymentDetailsPage from "./pages/Farmer/AddPaymentDetailsPage";
import FarmerDashboardPage from "./pages/Farmer/FarmerDashboardPage";
import BrowseListingsPage from "./pages/Buyer/BrowseListingsPage";
import BuyerDashboardPage from "./pages/Buyer/BuyerDashboardPage";
import AddPaymentPage from "./pages/Buyer/AddPaymentPage";
import CartPage from "./pages/Buyer/CartPage";
import CheckoutPage from "./pages/Buyer/CheckoutPage";
import FavoritesPage from "./pages/Buyer/FavoritesPage";
import FarmerPaymentsPage from "./pages/Farmer/FarmerPaymentsPage";
import AdminDashboard from "./components/AdminDashboard";
import ProductDetailsPage from "./pages/ProductDetailsPage";

const queryClient = new QueryClient();

// Wrapper component for product details
const ProductDetailsPageWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, users } = useGlobalState();
  const product = products.find((item) => item.id === id);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-700"
        >
          Go back
        </button>
      </div>
    );
  }

  const farmerUser = users.find((user) => user.id === product.farmerId);
  const farmer = product
    ? {
        id: product.farmerId,
        name: product.farmerName || farmerUser?.name || 'Farmer',
        email: farmerUser?.email || 'Not available',
        phone: farmerUser?.phone || 'Not available',
        location: product.location || farmerUser?.location || 'Unknown',
        rating: product.rating ?? 0,
        reviews: product.reviewEntries?.length ?? product.reviews ?? 0,
        totalSales: 0,
        joinDate: farmerUser?.createdAt ? new Date(farmerUser.createdAt).toLocaleDateString() : 'Not available',
        certifications: [],
        bio: farmerUser?.farmDetails ?? 'Verified seller on the platform.',
      }
    : undefined;

  if (!farmer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-700"
        >
          Go back
        </button>
      </div>
    );
  }
  
  return (
    <ProductDetailsPage
      product={product}
      farmer={farmer}
      onBack={() => navigate(-1)}
    />
  );
};

const AppRoutes = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isTryingToOpenAddProduct = queryParams.get('tab') === 'add-product';
  const isProfileIncomplete =
    currentUser?.role === 'farmer' ? !isProfileComplete(currentUser) : false;
  const isPaymentSetupIncomplete =
    currentUser?.role === 'farmer' ? !hasFarmerPaymentDetails(currentUser) : false;

  if (currentUser && isProfileIncomplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile?warning=profile-required" replace />;
  }

  if (currentUser && !isProfileIncomplete && location.pathname === '/complete-profile') {
    return <Navigate to="/farmer/dashboard" replace />;
  }

  if (
    currentUser?.role === 'farmer' &&
    isPaymentSetupIncomplete &&
    location.pathname === '/my-listings'
  ) {
    return <Navigate to="/farmer/payment-setup?warning=payment-required" replace />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Protected Routes - Require login */}
      {currentUser ? (
        <>
          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <Layout
                user={currentUser}
                onLogout={logout}
                currentPath="/dashboard"
              >
                <DashboardPage user={currentUser} />
              </Layout>
            }
          />
          
          {/* Common Pages */}
          <Route
            path="/profile"
            element={
              <Layout
                user={currentUser}
                onLogout={logout}
                currentPath="/profile"
              >
                <ProfilePage user={currentUser} />
              </Layout>
            }
          />
          <Route
            path="/complete-profile"
            element={
              <Layout
                user={currentUser}
                onLogout={logout}
                currentPath="/profile"
              >
                {currentUser.role === 'farmer' ? (
                  <CompleteProfilePage user={currentUser} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )}
              </Layout>
            }
          />
          <Route
            path="/settings"
            element={
              <Layout
                user={currentUser}
                onLogout={logout}
                currentPath="/settings"
              >
                <SettingsPage user={currentUser} />
              </Layout>
            }
          />
          <Route
            path="/messages"
            element={
              <Layout
                user={currentUser}
                onLogout={logout}
                currentPath="/messages"
              >
                <MessagesPage user={currentUser} />
              </Layout>
            }
          />
          <Route
            path="/chat"
            element={
              <Layout
                user={currentUser}
                onLogout={logout}
                currentPath="/chat"
              >
                <ChatListPage />
              </Layout>
            }
          />
          
          <Route
            path="/payment"
            element={
              currentUser.role === 'farmer' ? (
                <Navigate to="/farmer/payments" replace />
              ) : currentUser.role === 'buyer' ? (
                <Navigate to="/checkout" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          
          <Route
            path="/locations"
            element={
              <Layout
                user={currentUser}
                onLogout={logout}
                currentPath="/locations"
              >
                <LocationPage />
              </Layout>
            }
          />
          
          <Route
            path="/ratings"
            element={
              <Layout
                user={currentUser}
                onLogout={logout}
                currentPath="/ratings"
              >
                <RatingsPage />
              </Layout>
            }
          />
          
          <Route
            path="/delivery"
            element={
              <Layout
                user={currentUser}
                onLogout={logout}
                currentPath="/delivery"
              >
                <DeliveryPage />
              </Layout>
            }
          />
          
          <Route
            path="/notifications"
            element={
              <Layout
                user={currentUser}
                onLogout={logout}
                currentPath="/notifications"
              >
                <NotificationsPage />
              </Layout>
            }
          />
          
          {/* Orders (for both farmer and buyer) */}
          <Route
            path="/orders"
            element={
              <Layout
                user={currentUser}
                onLogout={logout}
                currentPath="/orders"
              >
                <OrdersPage user={currentUser} />
              </Layout>
            }
          />
          
          {/* Farmer Routes */}
          {currentUser.role === 'farmer' && (
            <>
              <Route
                path="/farmer/dashboard"
                element={
                  <Layout
                    user={currentUser}
                    onLogout={logout}
                    currentPath="/farmer/dashboard"
                  >
                    <FarmerDashboardPage />
                  </Layout>
                }
              />
              <Route
                path="/my-listings"
                element={
                  <Layout
                    user={currentUser}
                    onLogout={logout}
                    currentPath="/my-listings"
                  >
                    <MyListingsPage user={currentUser} />
                  </Layout>
                }
              />
              <Route
                path="/farmer/payment-setup"
                element={
                  <Layout
                    user={currentUser}
                    onLogout={logout}
                    currentPath="/farmer/payment-setup"
                  >
                    <AddPaymentDetailsPage user={currentUser} />
                  </Layout>
                }
              />
              <Route
                path="/farmer/payments"
                element={
                  <Layout
                    user={currentUser}
                    onLogout={logout}
                    currentPath="/farmer/payments"
                  >
                    <FarmerPaymentsPage user={currentUser} />
                  </Layout>
                }
              />
            </>
          )}
          
          {/* Buyer Routes */}
          {currentUser.role === 'buyer' && (
            <>
              <Route
                path="/buyer/dashboard"
                element={
                  <Layout
                    user={currentUser}
                    onLogout={logout}
                    currentPath="/buyer/dashboard"
                  >
                    <BuyerDashboardPage />
                  </Layout>
                }
              />
              <Route
                path="/browse"
                element={
                  <Layout
                    user={currentUser}
                    onLogout={logout}
                    currentPath="/browse"
                  >
                    <BrowseListingsPage user={currentUser} />
                  </Layout>
                }
              />
              <Route
                path="/buyer/add-payment"
                element={
                  <Layout
                    user={currentUser}
                    onLogout={logout}
                    currentPath="/buyer/add-payment"
                  >
                    <AddPaymentPage user={currentUser} />
                  </Layout>
                }
              />
              <Route
                path="/cart"
                element={
                  <Layout
                    user={currentUser}
                    onLogout={logout}
                    currentPath="/cart"
                  >
                    <CartPage />
                  </Layout>
                }
              />
              <Route
                path="/favorites"
                element={
                  <Layout
                    user={currentUser}
                    onLogout={logout}
                    currentPath="/favorites"
                  >
                    <FavoritesPage />
                  </Layout>
                }
              />
              <Route
                path="/checkout"
                element={
                  <Layout
                    user={currentUser}
                    onLogout={logout}
                    currentPath="/checkout"
                  >
                    <CheckoutPage />
                  </Layout>
                }
              />
            </>
          )}

          {/* Admin Routes */}
          {currentUser.role === 'admin' && (
            <Route
              path="/admin/dashboard"
              element={
                <Layout
                  user={currentUser}
                  onLogout={logout}
                  currentPath="/admin/dashboard"
                >
                  <AdminDashboard user={currentUser} onLogout={logout} />
                </Layout>
              }
            />
          )}
        </>
      ) : null}
      
      {/* Product Details Route - Public but needs product ID */}
      <Route path="/product/:id" element={
        currentUser ? (
          <Layout
            user={currentUser}
            onLogout={logout}
            currentPath=""
          >
            <ProductDetailsPageWrapper />
          </Layout>
        ) : (
          <Navigate to="/" replace />
        )
      } />
      
      {/* Catch All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <GlobalStateProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </GlobalStateProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
