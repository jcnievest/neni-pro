import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { getPendingRequestCount } from '@/api/catalog-requests';

export default function usePendingRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['catalog-request-count', user?.id],
    queryFn: () => getPendingRequestCount(user.id),
    enabled: Boolean(user?.id),
    staleTime: 20000,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });
}
