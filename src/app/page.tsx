'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }

    const user = getCurrentUser();

    if (user?.role === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }

    if (user?.role === 'partner') {
      router.replace('/dashboard');
      return;
    }

    router.replace('/login');
  }, [router]);

  return null;
}