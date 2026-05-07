import React, { useState } from 'react';
import { Bell, X, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type NotificationType = 'order' | 'message' | 'update';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon?: string;
  actionUrl?: string;
}

interface NotificationBellProps {
  notifications?: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onClearAll?: () => void;
  onDeleteNotification?: (notificationId: string) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications = [],
  onNotificationClick,
  onMarkAsRead,
  onClearAll,
  onDeleteNotification
}) => {
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | NotificationType>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case 'order':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'message':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'update':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'order':
        return '📦';
      case 'message':
        return '💬';
      case 'update':
        return '⭐';
      default:
        return '🔔';
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'order':
        return 'Orders';
      case 'message':
        return 'Messages';
      case 'update':
        return 'Updates';
      default:
        return 'All';
    }
  };

  const filteredNotifications =
    selectedTab === 'all'
      ? notifications
      : notifications.filter(n => n.type === selectedTab);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-5 h-5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 shadow-lg" align="end">
        <div className="flex flex-col max-h-96">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClearAll?.();
                }}
                className="text-xs h-auto"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <div className="text-4xl mb-2">🔔</div>
              <p className="text-gray-600 font-medium">No notifications yet</p>
              <p className="text-sm text-gray-500 text-center mt-1">
                Stay tuned for updates about your orders and messages
              </p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'all' | NotificationType)} className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b px-4 h-auto p-0">
                  <TabsTrigger
                    value="all"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="order"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
                  >
                    Orders
                  </TabsTrigger>
                  <TabsTrigger
                    value="message"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
                  >
                    Messages
                  </TabsTrigger>
                  <TabsTrigger
                    value="update"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
                  >
                    Updates
                  </TabsTrigger>
                </TabsList>

                {/* Notification List */}
                <TabsContent value={selectedTab} className="m-0 overflow-y-auto max-h-80">
                  <div className="divide-y">
                    {filteredNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 px-4">
                        <p className="text-sm text-gray-500">
                          No {getTypeLabel(selectedTab as NotificationType).toLowerCase()}
                        </p>
                      </div>
                    ) : (
                      filteredNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => {
                            if (!notification.read) {
                              onMarkAsRead?.(notification.id);
                            }
                            onNotificationClick?.(notification);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="text-xl flex-shrink-0 mt-0.5">
                              {getTypeIcon(notification.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={`text-sm ${
                                    !notification.read
                                      ? 'font-semibold text-gray-900'
                                      : 'font-medium text-gray-700'
                                  }`}
                                >
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTime(notification.timestamp)}
                              </p>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteNotification?.(notification.id);
                              }}
                              className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Footer - Show More */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    View all notifications
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
