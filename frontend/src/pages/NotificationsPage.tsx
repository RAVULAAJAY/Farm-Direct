import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
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

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const orderCount = notifications.filter((notification) => notification.type === 'order' && !notification.read).length;
  const messageCount = notifications.filter((notification) => notification.type === 'message' && !notification.read).length;
  const updateCount = notifications.filter((notification) => notification.type === 'update' && !notification.read).length;

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

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
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
                <div
                  key={notification.id}
                  className={`rounded-xl border-l-4 p-4 transition-all hover:shadow-md ${
                    notification.type === 'order'
                      ? 'border-l-blue-500 bg-gradient-to-r from-blue-50 to-transparent'
                      : notification.type === 'message'
                      ? 'border-l-purple-500 bg-gradient-to-r from-purple-50 to-transparent'
                      : 'border-l-green-500 bg-gradient-to-r from-green-50 to-transparent'
                  } ${!notification.read ? 'ring-2 ring-yellow-400 ring-offset-1' : 'opacity-90'}`}
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
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="ml-4 text-gray-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default NotificationsPage;