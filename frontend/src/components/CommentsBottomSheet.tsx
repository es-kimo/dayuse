import React, { useEffect, useState } from 'react';
import { verificationsApi } from '../api/verifications';
import type { CommentItem } from '../types';
import { formatKstDateTime } from '../utils/date';
import { X, Send, Loader2, User as UserIcon } from 'lucide-react';
import { BottomSheet, BottomSheetTitle, BottomSheetClose } from './ui/BottomSheet';
import { SheetGrab } from './dayu/ui';

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
        {/* 손잡이 · 헤더 */}
        <div className="flex shrink-0 flex-col gap-3.5 px-5 pt-2.5">
          <SheetGrab />
          <div className="flex items-center gap-2">
            <BottomSheetTitle className="flex-1 text-[18px] font-extrabold text-slate-800">
              댓글 <span className="text-blue-600">{comments.length}</span>
            </BottomSheetTitle>
            <BottomSheetClose
              className="focus-ring grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
              aria-label="닫기"
            >
              <X className="size-[22px]" aria-hidden="true" />
            </BottomSheetClose>
          </div>
        </div>

        {/* 댓글 목록 */}
        <div className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-5 py-3.5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-[14px] font-bold text-slate-800">아직 작성된 댓글이 없어요</p>
              <p className="mt-1 text-[13px]">첫 번째 응원의 한마디를 남겨 보세요!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2.5">
                {comment.authorProfileImageUrl ? (
                  <img
                    src={comment.authorProfileImageUrl}
                    alt={comment.authorNickname}
                    className="mt-0.5 size-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                    <UserIcon className="size-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <b className="truncate text-[14px] font-bold text-slate-800">{comment.authorNickname}</b>
                    <span className="shrink-0 text-[13px] text-slate-500">
                      {formatKstDateTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[14.5px] leading-[1.5] break-words whitespace-pre-wrap text-slate-800">
                    {comment.content}
                  </p>
                </div>

                {comment.isMine && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="shrink-0 cursor-pointer py-1 text-[12.5px] font-bold text-slate-500 transition-colors hover:text-red-700"
                    aria-label="댓글 삭제"
                  >
                    {deletingId === comment.id ? <Loader2 className="size-4 animate-spin" /> : '삭제'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* 댓글 작성 폼 */}
        <form
          onSubmit={handleSubmit}
          className="flex shrink-0 items-center gap-2 border-t border-slate-200 px-4 pt-2.5 pb-[calc(14px+env(safe-area-inset-bottom,0px))]"
        >
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 300))}
            disabled={submitting}
            placeholder="응원 한마디를 남겨 보세요"
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 text-[15.5px] text-slate-800 placeholder:text-slate-800/55 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-100 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            aria-label="댓글 전송"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      </>
    </BottomSheet>
  );
};
