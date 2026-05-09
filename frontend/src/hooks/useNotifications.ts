import { useEffect } from 'react';
import { initSocket, joinUserRoom, on, off } from '@/lib/socket';
import { useGlobalState } from '@/context/GlobalStateContext';
import { useToast } from '@/hooks/use-toast';

export default function useNotifications() {
  const {
    currentUser,
    addNotification,
    addActivityLog,
    addMessage: addMessageToState,
    markNotificationAsRead,
  } = useGlobalState();
  const { toast } = useToast();

  useEffect(() => {
    const socket = initSocket();
    if (!socket) return undefined;

    const handleNewNotification = (payload: any) => {
      try {
        addNotification(payload);
        // Show toast for new notification
        toast({
          title: payload.title,
          description: payload.message,
          duration: 5000,
        });
      } catch (e) {
        console.error('Failed to add notification', e);
      }
    };

    const handleUpdateNotification = (payload: any) => {
      try {
        addNotification(payload);
      } catch (e) {
        console.error('Failed to update notification', e);
      }
    };

    const handleDeleteNotification = (payload: any) => {
      // Backend will emit 'notification:delete' with { id }
      // For simplicity, reload notifications via storage sync is enough here
      try {
        // No-op: components can poll or storage event will update
      } catch (e) {}
    };

    const handleMessageNew = (message: any) => {
      try {
        addMessageToState(message);
        // Show toast for new message
        toast({
          title: 'New Message',
          description: `From ${message.senderName}: ${message.content}`,
          duration: 5000,
        });
        if (message && message.senderId) {
          addActivityLog({
            userId: message.senderId,
            userName: message.senderName,
            userRole: 'buyer',
            action: 'sent message',
            targetType: 'message',
            targetId: message.id,
            details: `To ${message.recipientName}`
          });
        }
      } catch (e) {
        console.error('Failed to handle message', e);
      }
    };

    const handleCartUpdate = (payload: any) => {
      // Cart updates from other tabs/devices - just for awareness
      // Local state is already updated via localStorage sync
      try {
        if (payload && payload.userId === currentUser?.id) {
          // Could show a toast or update UI here if needed
        }
      } catch (e) {}
    };

    on('notification:new', handleNewNotification);
    on('notification:update', handleUpdateNotification);
    on('notification:delete', handleDeleteNotification);
    on('message:new', handleMessageNew);
    on('cart:update', handleCartUpdate);

    if (currentUser) {
      joinUserRoom(currentUser.id);
    }

    return () => {
      off('notification:new', handleNewNotification);
      off('notification:update', handleUpdateNotification);
      off('notification:delete', handleDeleteNotification);
      off('message:new', handleMessageNew);
      off('cart:update', handleCartUpdate);
    };
  }, [currentUser, addNotification, addActivityLog, addMessageToState, markNotificationAsRead, toast]);
}

