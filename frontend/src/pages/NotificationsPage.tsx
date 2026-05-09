import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useGlobalState } from '@/context/GlobalStateContext';
import NotificationBell, { Notification } from '@/components/Notifications/NotificationBell';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    getNotificationsByUser,
    markNotificationAsRead,
    deleteNotification,
    clearNotificationsForUser,
  } = useGlobalState();

  const notifications = useMemo<Notification[]>(() => {
    if (!currentUser) {
      return [];
    }

    return getNotificationsByUser(currentUser.id).map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp,
      read: notification.read,
      actionUrl: notification.actionUrl,
    }));
  }, [currentUser, getNotificationsByUser]);

  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const orderCount = notifications.filter((notification) => notification.type === 'order' && !notification.read).length;
  const messageCount = notifications.filter((notification) => notification.type === 'message' && !notification.read).length;
  const updateCount = notifications.filter((notification) => notification.type === 'update' && !notification.read).length;

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  const handleCloseNotification = () => setSelectedNotification(null);

  const handleActionClick = (notification: Notification) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setSelectedNotification(null);
    } else if (notification.type === 'order') {
      navigate('/orders');
      setSelectedNotification(null);
    } else if (notification.type === 'message') {
      navigate('/messages');
      setSelectedNotification(null);
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    deleteNotification(notificationId);
  };

  const handleClearAll = () => {
    if (currentUser) {
      clearNotificationsForUser(currentUser.id);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    setSelectedNotification(notification);
  };

  if (!currentUser) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-600">Please log in to view notifications.</p>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-green-50 py-6 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">Notifications</h1>
          <p className="text-gray-600">Stay updated with orders and messages.</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Unread', value: unreadCount, color: 'text-red-600' },
            { label: 'Orders', value: orderCount, color: 'text-blue-600' },
            { label: 'Messages', value: messageCount, color: 'text-purple-600' },
            { label: 'Updates', value: updateCount, color: 'text-green-600' },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-medium overflow-hidden">
              <div className="p-4">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mb-6 border-0 shadow-medium p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Notification Center</h2>
          <div className="flex justify-center py-6 border-t border-blue-100">
            <NotificationBell
              notifications={notifications}
              onNotificationClick={handleNotificationClick}
              onMarkAsRead={handleMarkAsRead}
              onDeleteNotification={handleDeleteNotification}
              onClearAll={handleClearAll}
            />
          </div>
        </Card>

        <Card className="border-0 shadow-medium p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">All Notifications</h2>

          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-2 text-3xl">🎉</p>
              <p className="font-medium text-gray-500">No notifications</p>
              <p className="mt-1 text-sm text-gray-400">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left rounded-xl border-l-4 p-4 transition-all hover:shadow-md ${
                    notification.type === 'order'
                      ? 'border-l-blue-500 bg-gradient-to-r from-blue-50 to-transparent'
                      : notification.type === 'message'
                      ? 'border-l-purple-500 bg-gradient-to-r from-purple-50 to-transparent'
                      : 'border-l-green-500 bg-gradient-to-r from-green-50 to-transparent'
                  } ${!notification.read ? 'ring-2 ring-yellow-400 ring-offset-1' : 'opacity-90'} focus:outline-none focus:ring-2 focus:ring-blue-400`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        {new Date(notification.timestamp).toLocaleString()}
                        {!notification.read && (
                          <span className="ml-2 inline-block rounded-full bg-yellow-400 px-2 py-0.5 font-semibold text-yellow-900">
                            Unread
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      className="ml-4 text-gray-400 hover:text-red-600"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={Boolean(selectedNotification)} onOpenChange={(open) => { if (!open) setSelectedNotification(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title ?? 'Notification details'}</DialogTitle>
            <DialogDescription>
              {selectedNotification?.message ?? 'Select a notification to view more information.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
              <p className="text-sm text-gray-500">Received</p>
              <p className="mt-1 text-sm text-gray-700">
                {selectedNotification ? new Date(selectedNotification.timestamp).toLocaleString() : ''}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {selectedNotification?.actionUrl || selectedNotification?.type === 'order' || selectedNotification?.type === 'message' ? (
                <Button onClick={() => selectedNotification && handleActionClick(selectedNotification)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {selectedNotification?.actionUrl ? 'Go to details' : selectedNotification?.type === 'order' ? 'View orders' : 'View messages'}
                </Button>
              ) : null}
              <Button variant="outline" onClick={handleCloseNotification}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationsPage;