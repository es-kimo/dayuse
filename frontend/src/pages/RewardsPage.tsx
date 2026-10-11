import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';
import { PageTabs } from '../components/dayu/ui';
import { CoinRewardsPanel } from '../components/rewards/CoinRewardsPanel';
import { TicketRewardsPanel } from '../components/rewards/TicketRewardsPanel';
import { useAuth } from '../context/AuthContext';
import { useBackNavigation } from '../hooks/useBackNavigation';

export function RewardsPage() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={queryClient}><RewardsContent /></QueryClientProvider>;
}

function RewardsContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const handleBack = useBackNavigation('/today');
  const tab = params.get('tab') === 'tickets' ? 'tickets' : 'coins';

  if (!isLoading && !isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(`/rewards?tab=${tab}`)}`} replace />;
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-app flex-col bg-slate-50 font-sans text-slate-800">
      <AppHeader title="내 보상" onBack={handleBack} />
      <PageTabs value={tab} onChange={(next) => setParams({ tab: next }, { replace: true })}
        options={[{ value: 'coins', label: '코인' }, { value: 'tickets', label: '리데이 티켓' }]} label="보상 종류" />
      <main key={user?.id} className="flex flex-1 flex-col px-4 pt-4 pb-12">
        {isLoading ? <p role="status" className="py-10 text-center text-sm text-slate-500">내 보상을 불러오는 중이에요...</p>
          : tab === 'coins' ? <CoinRewardsPanel /> : <TicketRewardsPanel />}
      </main>
    </div>
  );
}
