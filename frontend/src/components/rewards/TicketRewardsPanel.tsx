import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { redayApi } from '../../api/reday';
import { useAuth } from '../../context/AuthContext';
import { RedayTicket } from '../brand/RedayTicket';
import { Button, Card, Chip } from '../dayu/ui';
import type { RedayTicketSource } from '../../types';

const sourceLabels: Record<RedayTicketSource, string> = {
  REWARD_AD: '광고 시청 보상',
  ADMIN_GRANT: '운영팀 지급',
  WELCOME_BONUS: '웰컴 보너스',
};

export function TicketRewardsPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['reward-tickets', user?.id],
    queryFn: async () => {
      const [balance, history] = await Promise.all([redayApi.getTicketBalance(), redayApi.getTicketHistory()]);
      return { balance, tickets: [...history.tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
    },
  });
  const ready = !isPending && !isError && data;

  return (
    <div className="flex flex-col gap-[14px]" aria-busy={isPending}>
      <Card tone="hero">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-500">데이유즈 리데이 티켓</p>
            <p className="mt-2 break-all text-[32px] font-extrabold leading-tight tracking-tight tabular-nums">
              {ready ? data.balance.availableCount.toLocaleString() : '—'}<span className="ml-2 text-[15px] font-bold text-slate-500">장</span>
            </p>
          </div>
          <RedayTicket size={80} className="shrink-0" />
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-slate-600">늦었지만 해낸 날, 다시 기회를.<br />티켓 <strong className="text-blue-600">1장</strong>으로 지각 인증의 벌금을 면제해요.</p>
      </Card>

      {isPending ? <Card role="status" className="py-10 text-center text-[13px] text-slate-500">티켓을 불러오는 중이에요...</Card>
        : isError ? (
          <Card role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="size-6 text-slate-400" />
            <p className="text-[14px] text-slate-600">티켓 정보를 불러오지 못했어요.</p>
            <Button variant="line" size="sm" onClick={() => void refetch()}>다시 불러오기</Button>
          </Card>
        ) : (
          <>
            <Card>
              <h2 className="text-[15px] font-bold">리데이 티켓, 이렇게 써요</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">리데이가 가능한 챌린지에서 지각 인증을 마친 뒤, 해당 기록의 ‘리데이 티켓 사용하기’를 눌러 주세요.</p>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-500">사용 기한 안에만 쓸 수 있고, 지각 기록은 그대로 남아요. 티켓이 없다면 해당 기록에서 광고를 보고 받을 수 있어요.</p>
              <Button variant="line" size="sm" className="mt-4 w-full" onClick={() => navigate('/groups')}>내 모임에서 확인하기<ChevronRight className="size-4" /></Button>
            </Card>
            <Card>
              <h2 className="text-[15px] font-bold">티켓 내역</h2>
              {data?.tickets.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <RedayTicket size={48} />
                  <p className="mt-3 text-[14px] font-bold text-slate-700">아직 받은 티켓이 없어요</p>
                  <p className="mt-1 text-[12.5px] text-slate-500">티켓을 받거나 사용하면 여기에서 확인할 수 있어요.</p>
                </div>
              ) : (
                <div className="mt-2 divide-y divide-slate-100">
                  {data?.tickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-start gap-2.5 py-3.5">
                      <RedayTicket used={ticket.status === 'USED'} size={36} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[13px] font-bold">{sourceLabels[ticket.source] ?? '티켓 지급'}</p>
                          <Chip tone={ticket.status === 'USED' ? 'gray' : 'blue'}>{ticket.status === 'USED' ? '사용 완료' : '사용 가능'}</Chip>
                        </div>
                        <p className="mt-1 text-[11.5px] text-slate-500">{ticket.createdAt.slice(0, 10)} · 1장 받음</p>
                        {ticket.usedAt && <p className="mt-1 text-[11.5px] text-slate-500">{ticket.usedAt.slice(0, 10)} · 벌금 면제에 사용</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
    </div>
  );
}
