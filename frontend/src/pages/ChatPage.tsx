import React from 'react';
import ChatHub from '@/components/Chat/ChatHub';

const ChatPage: React.FC = () => {
  return (
    <ChatHub
      title="Chat"
      subtitle="Talk with farmers and buyers using the messages saved in shared state."
    />
  );
};

export default ChatPage;