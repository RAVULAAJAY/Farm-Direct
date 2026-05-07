import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface ChatMessage {
  id: string;
  sender: string;
  senderType: 'user' | 'other';
  message: string;
  timestamp: string;
  avatar?: string;
  read?: boolean;
}

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUserMessage = message.senderType === 'user';

  return (
    <div className={`flex gap-3 mb-4 ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
      {!isUserMessage && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.avatar} alt={message.sender} />
          <AvatarFallback>{message.sender.charAt(0)}</AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col gap-1 max-w-xs ${isUserMessage ? 'items-end' : 'items-start'}`}>
        {!isUserMessage && (
          <p className="text-xs font-semibold text-gray-700">{message.sender}</p>
        )}

        <div
          className={`px-4 py-2 rounded-lg ${
            isUserMessage
              ? 'bg-green-600 text-white rounded-br-none'
              : 'bg-gray-200 text-gray-900 rounded-bl-none'
          }`}
        >
          <p className="text-sm break-words">{message.message}</p>
        </div>

        <span className="text-xs text-gray-500 px-1">
          {message.timestamp}
        </span>

        {isUserMessage && message.read && (
          <Badge variant="secondary" className="text-xs">
            ✓✓ Read
          </Badge>
        )}
      </div>

      {isUserMessage && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.avatar} alt={message.sender} />
          <AvatarFallback>{message.sender.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatBubble;
