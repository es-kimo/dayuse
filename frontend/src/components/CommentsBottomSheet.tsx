import React, { useEffect, useState } from 'react';
import { verificationsApi } from '../api/verifications';
import type { CommentItem } from '../types';
import { formatKstDateTime } from '../utils/date';
import { X, Send, Trash2, Loader2, User as UserIcon } from 'lucide-react';
import { BottomSheet, BottomSheetTitle, BottomSheetClose } from './ui/BottomSheet';

interface CommentsBottomSheetProps {
  isOpen: boolean;
  /** 닫혀 있을 때는 null이다 */
  verificationId: number | null;
  onClose: () => void;
  onCommentCountChange?: (delta: number) => void;
}

export const CommentsBottomSheet: React.FC<CommentsBottomSheetProps> = ({
  isOpen,
  verificationId,
  onClose,
  onCommentCountChange,
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [content, setContent] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /*
   * 시트가 열려 있을 때만 불러온다.
   * 닫혀도 컴포넌트는 마운트된 상태로 남으므로(이탈 전환을 위해),
   * 다시 열릴 때 이전 목록이 잠깐 보이지 않도록 loading을 먼저 세운다.
   */
  useEffect(() => {
    if (!isOpen || verificationId === null) return;

    let cancelled = false;
    setLoading(true);

    verificationsApi
      .getComments(verificationId)
      .then((list) => {
        if (!cancelled) setComments(list);
      })
      .catch((err) => {
        console.error('Failed to load comments:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, verificationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting || verificationId === null) return;

    setSubmitting(true);
    try {
      const newComment = await verificationsApi.createComment(verificationId, content.trim());
      setComments((prev) => [...prev, newComment]);
      setContent('');
      onCommentCountChange?.(1);
    } catch (err) {
      console.error('Failed to create comment:', err);
      alert('댓글 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    setDeletingId(commentId);
    try {
      await verificationsApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentCountChange?.(-1);
    } catch (err) {
      console.error('Failed to delete comment:', err);
      alert('댓글 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <BottomSheet open={isOpen} size="tall" onOpenChange={(next) => !next && onClose()}>
      <>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <BottomSheetTitle className="text-sm font-bold text-slate-800">
            댓글 <span className="text-blue-600 font-normal">({comments.length})</span>
          </BottomSheetTitle>
          <BottomSheetClose
            className="touch-target text-slate-400 hover:text-slate-700 rounded-md transition focus-ring"
            aria-label="닫기"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </BottomSheetClose>
        </div>

        {/* 댓글 목록 */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-xs">아직 작성된 댓글이 없습니다.</p>
              <p className="text-[11px] mt-1">첫 번째 응원의 한마디를 남겨보세요!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start justify-between gap-3 group">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  {comment.authorProfileImageUrl ? (
                    <img
                      src={comment.authorProfileImageUrl}
                      alt={comment.authorNickname}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {comment.authorNickname}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatKstDateTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>

                {comment.isMine && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 transition opacity-80 shrink-0 rounded-md active:scale-95"
                    title="댓글 삭제"
                    aria-label="댓글 삭제"
                  >
                    {deletingId === comment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* 댓글 작성 폼 */}
        <form
          onSubmit={handleSubmit}
          className="px-3 pt-3 pb-safe border-t border-slate-100 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 300))}
            disabled={submitting}
            placeholder="응원과 격려의 댓글을 남겨보세요..."
            className="flex-1 text-base min-h-[44px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:border-blue-500 transition text-slate-800 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="w-11 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-md transition shadow-xs shrink-0 flex items-center justify-center"
            aria-label="댓글 전송"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </>
    </BottomSheet>
  );
};
