import { createFileRoute, redirect } from '@tanstack/react-router';
import { getAccessToken } from 'src/client/contexts/AuthContext';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const token = getAccessToken();
    if (!token) {
      throw redirect({
        to: '/login',
      });
    }
    throw redirect({
      to: '/reports',
    });
  },
});
