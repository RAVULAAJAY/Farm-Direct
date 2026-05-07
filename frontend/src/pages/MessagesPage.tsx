import React from 'react';
import ChatHub from '@/components/Chat/ChatHub';

interface MessagesPageProps {
  user?: unknown;
}

const MessagesPage: React.FC<MessagesPageProps> = () => {
  return (
    <ChatHub
      title="Messages"
      subtitle="View your existing farmer and buyer conversations in one place."
    />
  );
};

export default MessagesPage;