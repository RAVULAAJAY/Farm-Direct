import React, { useEffect, useMemo, useState } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGlobalState } from '@/context/GlobalStateContext';
import ChatScreen, { ChatParticipant } from './ChatScreen';
import { ChatMessage } from './ChatBubble';

interface ConversationSummary extends ChatParticipant {
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
}

interface ChatHubProps {
  title: string;
  subtitle: string;
}

const buildAvatar = (name: string) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%2322c55e"/%3E%3Ctext x="50" y="60" font-size="36" fill="white" text-anchor="middle" font-family="Arial"%3E${initials}%3C/text%3E%3C/svg%3E`;
};

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const ChatHub: React.FC<ChatHubProps> = ({ title, subtitle }) => {
  const {
    currentUser,
    users,
    messages,
    addMessage,
    getConversationMessages,
    markMessagesAsRead,
  } = useGlobalState();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const contextPartnerId = searchParams.get('partnerId');
  const contextOrderId = searchParams.get('orderId');
  const contextProductName = searchParams.get('productName');
  const contextDraft = searchParams.get('draft') ?? '';

  const contactableUsers = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return users
      .filter((entry) => {
        if (entry.id === currentUser.id || entry.isActive === false) {
          return false;
        }

        if (currentUser.role === 'admin') {
          return entry.role !== 'admin';
        }

        return entry.role !== currentUser.role;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [currentUser, users]);

  const conversationSummaries = useMemo<ConversationSummary[]>(() => {
    if (!currentUser) {
      return [];
    }

    const conversationMap = new Map<string, ConversationSummary>();
    const relevantMessages = messages.filter(
      (message) =>
        message.senderId === currentUser.id || message.recipientId === currentUser.id
    );

    relevantMessages.forEach((message) => {
      const isOutgoing = message.senderId === currentUser.id;
      const partnerId = isOutgoing ? message.recipientId : message.senderId;
      const partner = users.find((stateUser) => stateUser.id === partnerId);
      const existing = conversationMap.get(partnerId);

      if (!existing || new Date(message.timestamp).getTime() >= new Date(existing.lastMessageTime).getTime()) {
        conversationMap.set(partnerId, {
          id: partnerId,
          name: partner?.name ?? (isOutgoing ? message.recipientName : message.senderName),
          location: partner?.location ?? 'Local farm',
          avatar: buildAvatar(partner?.name ?? (isOutgoing ? message.recipientName : message.senderName)),
          rating: undefined,
          responseTime: undefined,
          isOnline: partner?.role === 'farmer' ? true : false,
          unreadCount: 0,
          lastMessage: message.content,
          lastMessageTime: formatTime(message.timestamp),
        });
      }

      const summary = conversationMap.get(partnerId);
      if (summary && !message.read && message.recipientId === currentUser.id) {
        summary.unreadCount += 1;
      }
    });

    return Array.from(conversationMap.values()).sort((left, right) => {
      const leftMessages = getConversationMessages(currentUser.id, left.id);
      const rightMessages = getConversationMessages(currentUser.id, right.id);
      const leftLast = leftMessages[leftMessages.length - 1];
      const rightLast = rightMessages[rightMessages.length - 1];

      return (
        new Date(rightLast?.timestamp ?? 0).getTime() -
        new Date(leftLast?.timestamp ?? 0).getTime()
      );
    });
  }, [currentUser, getConversationMessages, messages, users]);

  const conversationCandidates = useMemo<ConversationSummary[]>(() => {
    const mergedById = new Map<string, ConversationSummary>();
    conversationSummaries.forEach((conversation) => {
      mergedById.set(conversation.id, conversation);
    });

    contactableUsers.forEach((entry) => {
      if (mergedById.has(entry.id)) {
        return;
      }

      mergedById.set(entry.id, {
        id: entry.id,
        name: entry.name,
        location: entry.location,
        avatar: buildAvatar(entry.name),
        rating: undefined,
        responseTime: undefined,
        isOnline: entry.role === 'farmer',
        unreadCount: 0,
        lastMessage: `Start a conversation with this ${entry.role}.`,
        lastMessageTime: '',
      });
    });

    return Array.from(mergedById.values());
  }, [contactableUsers, conversationSummaries]);

  useEffect(() => {
    if (contextPartnerId) {
      setSelectedPartnerId(contextPartnerId);
      return;
    }

    if (!selectedPartnerId && conversationCandidates.length > 0) {
      setSelectedPartnerId(conversationCandidates[0].id);
    }
  }, [contextPartnerId, conversationCandidates, selectedPartnerId]);

  useEffect(() => {
    if (!currentUser || !selectedPartnerId) {
      return;
    }

    const unreadMessageIds = getConversationMessages(currentUser.id, selectedPartnerId)
      .filter((message) => message.recipientId === currentUser.id && !message.read)
      .map((message) => message.id);

    if (unreadMessageIds.length > 0) {
      markMessagesAsRead(unreadMessageIds);
    }
  }, [currentUser, getConversationMessages, markMessagesAsRead, selectedPartnerId]);

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-600 py-8">Please log in to view messages.</p>
        </CardContent>
      </Card>
    );
  }

  const filteredConversations = conversationCandidates.filter((conversation) =>
    conversation.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversationFromList =
    filteredConversations.find((conversation) => conversation.id === selectedPartnerId) ??
    filteredConversations[0] ??
    null;

  const selectedConversation = selectedConversationFromList
    ? selectedConversationFromList
    : selectedPartnerId
    ? (() => {
        const partnerUser = users.find((user) => user.id === selectedPartnerId);
        if (!partnerUser) {
          return null;
        }

        return {
          id: partnerUser.id,
          name: partnerUser.name,
          location: partnerUser.location,
          avatar: buildAvatar(partnerUser.name),
          rating: undefined,
          responseTime: undefined,
          isOnline: partnerUser.role === 'farmer',
          unreadCount: 0,
          lastMessage: '',
          lastMessageTime: '',
        };
      })()
    : null;

  const threadMessages: ChatMessage[] = selectedConversation
    ? getConversationMessages(currentUser.id, selectedConversation.id).map((message) => ({
        id: message.id,
        sender: message.senderId === currentUser.id ? currentUser.name : message.senderName,
        senderType: message.senderId === currentUser.id ? 'user' : 'other',
        message: message.content,
        timestamp: formatTime(message.timestamp),
        avatar: message.senderId === currentUser.id ? buildAvatar(currentUser.name) : selectedConversation.avatar,
        read: message.read,
      }))
    : [];

  const handleSendMessage = (messageText: string) => {
    if (!selectedConversation) {
      return;
    }

    addMessage({
      id: `message_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      recipientId: selectedConversation.id,
      recipientName: selectedConversation.name,
      content: messageText,
      timestamp: new Date().toISOString(),
      read: false,
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600">{subtitle}</p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-2">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selectedConversation?.id === conversation.id ? 'ring-2 ring-green-500' : ''
                }`}
                onClick={() => setSelectedPartnerId(conversation.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <img
                        src={conversation.avatar}
                        alt={conversation.name}
                        className="h-14 w-14 rounded-full border border-gray-200 object-cover"
                      />
                      {conversation.isOnline && (
                        <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate font-semibold text-gray-900">{conversation.name}</h3>
                        <span className="shrink-0 text-xs text-gray-500">{conversation.lastMessageTime}</span>
                      </div>

                      <p className="mt-1 truncate text-sm text-gray-600">{conversation.lastMessage}</p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">{conversation.location}</span>
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-green-600 text-white hover:bg-green-700">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-gray-600">
                  <MessageCircle className="h-8 w-8 text-gray-400" />
                  <p>No conversations found.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="min-h-[640px]">
          {selectedConversation ? (
            <ChatScreen
              participant={selectedConversation}
              messages={threadMessages}
              onSendMessage={handleSendMessage}
              initialMessage={selectedConversation.id === contextPartnerId ? contextDraft : ''}
              contextInfo={
                selectedConversation.id === contextPartnerId && contextOrderId
                  ? `Order context: #${contextOrderId}${contextProductName ? ` · ${contextProductName}` : ''}`
                  : undefined
              }
            />
          ) : (
            <Card className="h-full">
              <CardContent className="flex h-full items-center justify-center pt-6">
                <div className="text-center text-gray-500">
                  <MessageCircle className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-3 text-sm">Select a conversation to start chatting.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHub;