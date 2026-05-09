import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  role?: 'farmer' | 'buyer' | 'admin';
  location: string;
  avatar: string;
  email?: string;
  phone?: string;
  joinedDate?: string;
  farmName?: string;
  farmDetails?: string;
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

const BOTTOM_THRESHOLD_PX = 96;

const isNearBottom = (element: HTMLDivElement) => {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_THRESHOLD_PX;
};

const ChatScreen: React.FC<ChatScreenProps> = ({
  participant,
  messages,
  onSendMessage,
  initialMessage,
  contextInfo,
  onBack,
}) => {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousLayoutRef = useRef({
    conversationId: participant.id,
    messageCount: messages.length,
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
  });

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) {
      return;
    }

    const handleScroll = () => {
      previousLayoutRef.current = {
        ...previousLayoutRef.current,
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      };
    };

    handleScroll();
    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [participant.id]);

  useLayoutEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) {
      return;
    }

    const previous = previousLayoutRef.current;
    const nextLastMessage = messages[messages.length - 1];
    const conversationChanged = previous.conversationId !== participant.id;
    const distanceFromBottom =
      previous.scrollHeight - previous.scrollTop - previous.clientHeight;
    const shouldStickToBottom =
      conversationChanged ||
      previous.messageCount === 0 ||
      nextLastMessage?.senderType === 'user' ||
      distanceFromBottom <= BOTTOM_THRESHOLD_PX;

    if (shouldStickToBottom) {
      const behavior = conversationChanged || previous.messageCount === 0 ? 'auto' : 'smooth';
      element.scrollTo({ top: element.scrollHeight, behavior });
    } else if (
      previous.messageCount !== messages.length ||
      previous.scrollHeight !== element.scrollHeight
    ) {
      const heightDelta = element.scrollHeight - previous.scrollHeight;
      element.scrollTop = Math.max(0, previous.scrollTop + heightDelta);
    }

    previousLayoutRef.current = {
      conversationId: participant.id,
      messageCount: messages.length,
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
  }, [messages, participant.id]);

  const handleSendMessage = useCallback(
    (message: string) => {
      onSendMessage(message);
    },
    [onSendMessage]
  );

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
              <DropdownMenuItem onSelect={() => setIsProfileOpen(true)}>
                View Profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div ref={scrollContainerRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-gray-50 p-4">
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
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        placeholder={`Message ${participant.name}...`}
        initialValue={initialMessage}
      />

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{participant.farmName || participant.name}</DialogTitle>
            <DialogDescription>
              Basic profile and farm details. Only public information is shown.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={participant.avatar} alt={participant.name} />
                  <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-gray-900">{participant.name}</p>
                  <span className="inline-flex rounded-full bg-green-50 px-2 py-1 text-xs font-medium uppercase tracking-[0.15em] text-green-700">
                    {participant.role ?? 'Farmer'}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-gray-700">
                {participant.email && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Email</p>
                    <p className="mt-1 text-gray-900">{participant.email}</p>
                  </div>
                )}
                {participant.phone && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Phone</p>
                    <p className="mt-1 text-gray-900">{participant.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Location</p>
                  <p className="mt-1 text-gray-900">{participant.location}</p>
                </div>
                {participant.joinedDate && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Joined</p>
                    <p className="mt-1 text-gray-900">{participant.joinedDate}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Farm overview</p>
              <p className="mt-3 text-sm leading-6 text-gray-800">
                {participant.farmDetails || 'No farm details available yet.'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsProfileOpen(false)} className="mt-4">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default React.memo(ChatScreen);
