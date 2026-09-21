import React, { useState } from 'react';
import type { FeedItem } from '../types';
import { formatKstTime } from '../utils/date';
import {
  MessageCircle,
  Trash2,
  Calendar,
  AlertTriangle,
  User as UserIcon,
  Loader2,
} from 'lucide-react';

interface GroupFeedSectionProps {
  feedItems: FeedItem[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  onOpenComments: (verificationId: number) => void;
  onDeleteVerification: (verificationId: number) => void;
}

export const GroupFeedSection: React.FC<GroupFeedSectionProps> = ({
  feedItems,
  loading,
  hasMore,
  onLoadMore,
  loadingMore,
  onOpenComments,
  onDeleteVerification,
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!window.confirm('인증을 삭제하시겠습니까?\n오늘 인증을 삭제하면 다시 인증 대기 상태로 변경됩니다.')) {
      return;
    }
    setDeletingId(id);
    try {
      await onDeleteVerification(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs animate-pulse space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-200 rounded-full" />
              <div className="h-4 bg-slate-200 rounded w-24" />
            </div>
            <div className="h-56 bg-slate-100 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center my-4">
        <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800 mb-1">아직 등록된 인증이 없습니다.</h3>
        <p className="text-xs text-slate-500">
          첫 번째 인증의 주인공이 되어보세요!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold text-slate-800">모임 인증 피드</h2>
        <span className="text-[11px] text-slate-400">최신순</span>
      </div>

      <div className="space-y-4">
        {feedItems.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs space-y-3"
          >
            {/* 상단 작성자 정보 헤더 */}
            <div className="p-3.5 pb-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {item.authorProfileImageUrl ? (
                  <img
                    src={item.authorProfileImageUrl}
                    alt={item.authorNickname}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{item.authorNickname}</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 font-medium">
                      {item.challengeTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-3 h-3" />
                      {item.targetDate}
                    </span>
                    {item.isLate && (
                      <span className="text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        늦은 인증
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {item.isMine && (
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-red-500 transition rounded-xl active:scale-95"
                  title="인증 삭제"
                  aria-label="인증 삭제"
                >
                  {deletingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {/* 인증 사진 */}
            <div className="px-3.5">
              <div className="rounded-xl overflow-hidden aspect-4/3 bg-slate-100 border border-slate-100">
                <img
                  src={item.imageUrl}
                  alt="인증 사진"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            {/* 인증 한마디 문구 */}
            {item.comment && (
              <div className="px-3.5">
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {item.comment}
                </p>
              </div>
            )}

            {/* 하단 소통 바 (댓글 버튼) */}
            <div className="px-3.5 py-1.5 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => onOpenComments(item.id)}
                className="min-h-[44px] text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1.5 transition active:scale-95 py-1 px-1 -ml-1 rounded-lg"
              >
                <MessageCircle className="w-4 h-4 text-slate-400 hover:text-blue-500" />
                <span>댓글 {item.commentCount}개</span>
              </button>

              <span className="text-[10px] text-slate-400">
                {formatKstTime(item.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 더보기 버튼 */}
      {hasMore && (
        <div className="pt-2 text-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-2xs"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>피드 불러오는 중...</span>
              </>
            ) : (
              <span>이전 인증 더보기</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
