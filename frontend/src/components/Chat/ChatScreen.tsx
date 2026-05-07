import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, MoreVertical, MapPin, Star } from 'lucide-react';
import ChatBubble, { ChatMessage } from './ChatBubble';
import MessageInput from './MessageInput';

export interface ChatParticipant {
  id: string;
  name: string;
  location: string;
  avatar: string;
  rating?: number;
  responseTime?: string;
  isOnline?: boolean;
}

interface ChatScreenProps {
  participant: ChatParticipant;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  initialMessage?: string;
  contextInfo?: string;
  onBack?: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({
  participant,
  messages,
  onSendMessage,
  initialMessage,
  contextInfo,
  onBack,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <div className="border-b bg-white">
        <div className="flex items-start justify-between gap-4 p-4">
          <div className="flex min-w-0 items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}

            <div className="relative flex-shrink-0">
              <Avatar className="h-12 w-12">
                <AvatarImage src={participant.avatar} alt={participant.name} />
                <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {participant.isOnline && (
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-semibold text-gray-900">{participant.name}</h2>
                {participant.isOnline && (
                  <Badge variant="secondary" className="bg-green-50 text-xs text-green-700">
                    Online
                  </Badge>
                )}
              </div>

              <div className="mt-1 flex flex-col gap-1 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{participant.location}</span>
                </div>
                {(participant.rating || participant.responseTime) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {participant.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {participant.rating}
                      </div>
                    )}
                    {participant.responseTime && <span>Responds in {participant.responseTime}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem>Archive conversation</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-gray-50 p-4">
        {contextInfo && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            {contextInfo}
          </div>
        )}
        {messages.length > 0 ? (
          messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500">No messages yet. Start the conversation.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSendMessage={onSendMessage}
        placeholder={`Message ${participant.name}...`}
        initialValue={initialMessage}
      />
    </div>
  );
};

export default ChatScreen;
