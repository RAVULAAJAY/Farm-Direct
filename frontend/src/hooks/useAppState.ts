import { useAuth } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';

/**
 * Combined hook to access both Auth and Global State
 * Provides a unified interface to access user info and app state
 */
export const useAppState = () => {
  const auth = useAuth();
  const globalState = useGlobalState();

  return {
    // User state
    user: auth.currentUser,
    userRole: auth.currentUser?.role,
    isLoggedIn: !!auth.currentUser,
    login: auth.login,
    signup: auth.signup,
    logout: auth.logout,

    // Global state
    products: globalState.products,
    orders: globalState.orders,
    messages: globalState.messages,

    // Product operations
    addProduct: globalState.addProduct,
    updateProduct: globalState.updateProduct,
    deleteProduct: globalState.deleteProduct,
    getProductById: globalState.getProductById,
    getProductsByFarmer: globalState.getProductsByFarmer,

    // Order operations
    addOrder: globalState.addOrder,
    updateOrder: globalState.updateOrder,
    deleteOrder: globalState.deleteOrder,
    getOrderById: globalState.getOrderById,
    getOrdersByBuyer: globalState.getOrdersByBuyer,
    getOrdersByFarmer: globalState.getOrdersByFarmer,

    // Message operations
    addMessage: globalState.addMessage,
    getMessagesByUser: globalState.getMessagesByUser,
    markMessagesAsRead: globalState.markMessagesAsRead,
    getUnreadMessageCount: globalState.getUnreadMessageCount,

    // Statistics
    getTotalSpentByBuyer: globalState.getTotalSpentByBuyer,
    getOrderCountByBuyer: globalState.getOrderCountByBuyer,
    getFarmerRevenue: globalState.getFarmerRevenue,
    getFarmerOrderCount: globalState.getFarmerOrderCount,
  };
};