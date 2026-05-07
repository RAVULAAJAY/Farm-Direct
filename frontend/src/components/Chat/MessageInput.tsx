import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Smile } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  initialValue?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
  initialValue = '',
}) => {
  const [message, setMessage] = useState(initialValue);

  useEffect(() => {
    setMessage(initialValue);
  }, [initialValue]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-white p-4 space-y-3">
      {/* Character counter */}
      <div className="flex justify-between items-center px-2">
        <span className="text-xs text-gray-400">
          {message.length > 0 ? `${message.length} characters` : ''}
        </span>
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="flex-shrink-0"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5 text-gray-600" />
        </Button>

        {/* Input Field */}
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-10 py-2 text-sm"
          />
        </div>

        {/* Emoji Button */}
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="flex-shrink-0"
          title="Add emoji"
        >
          <Smile className="h-5 w-5 text-gray-600" />
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          size="icon"
          className="flex-shrink-0 bg-green-600 hover:bg-green-700"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500 px-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};

export default MessageInput;
