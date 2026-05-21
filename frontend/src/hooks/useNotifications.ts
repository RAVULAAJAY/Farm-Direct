import { useEffect } from 'react';
import { initSocket } from '@/lib/socket';

export default function useNotifications() {
  useEffect(() => {
    void initSocket();
  }, []);
}

