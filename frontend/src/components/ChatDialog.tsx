
import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useGlobalState } from "@/context/GlobalStateContext";

export interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  currentUserId: string;
  recipientId: string;
}

const ChatDialog: React.FC<ChatDialogProps> = ({
  isOpen,
  onClose,
  recipientName,
  currentUserId,
  recipientId,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const {
    currentUser,
    getConversationMessages,
    addMessage,
    markMessagesAsRead,
  } = useGlobalState();

  const messages = useMemo(
    () => getConversationMessages(currentUserId, recipientId),
    [currentUserId, getConversationMessages, recipientId]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const unreadMessages = messages
      .filter((message) => message.recipientId === currentUserId && !message.read)
      .map((message) => message.id);

    if (unreadMessages.length > 0) {
      markMessagesAsRead(unreadMessages);
    }
  }, [currentUserId, isOpen, markMessagesAsRead, messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      addMessage({
        id: `message_${Date.now()}`,
        senderId: currentUserId,
        senderName: currentUser?.name ?? 'You',
        recipientId,
        recipientName,
        content: newMessage,
        timestamp: new Date().toISOString(),
        read: false,
      });
      setNewMessage('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chat with {recipientName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-96">
          <ScrollArea className="flex-1 p-4 border rounded-md">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-2 p-2 rounded-lg max-w-xs ${
                    message.senderId === currentUserId
                      ? 'bg-green-500 text-white ml-auto'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))
            )}
          </ScrollArea>
          <div className="flex gap-2 mt-4">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;
