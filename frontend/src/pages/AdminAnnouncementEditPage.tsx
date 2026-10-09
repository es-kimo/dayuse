import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save,
  Send,
} from 'lucide-react';
import { Button, Card, Segmented } from '../components/dayu/ui';
import { SubPageHeader } from '../components/layout/SubPageHeader';
import { AnnouncementPreview } from '../components/announcement/AnnouncementPreview';
import {
  createAdminAnnouncement,
  endAdminAnnouncement,
  getAdminAnnouncement,
  publishAdminAnnouncement,
  updateAdminAnnouncement,
} from '../api/announcements';
import { useToast } from '../context/ToastContext';
import type {
  AnnouncementActionTarget,
  AnnouncementAdminResponse,
  AnnouncementFeatureConditionType,
  AnnouncementPlacement,
  AnnouncementUpsertRequest,
} from '../types';

export const AdminAnnouncementEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const announcementId = !isNew ? parseInt(id, 10) : null;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewMode, setPreviewMode] = useState<'home' | 'inline' | 'list' | 'detail'>('home');

  // Form State
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaTarget, setCtaTarget] = useState<AnnouncementActionTarget | ''>('');
  const [placement, setPlacement] = useState<AnnouncementPlacement | ''>('');
  const [homeVisible, setHomeVisible] = useState(false);
  const [featureConditionType, setFeatureConditionType] =
    useState<AnnouncementFeatureConditionType>('ALL_USERS');
  const [featureKey, setFeatureKey] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [noticeEndsAt, setNoticeEndsAt] = useState('');

  // Server state metadata
  const [existingAnnouncement, setExistingAnnouncement] =
    useState<AnnouncementAdminResponse | null>(null);

  useEffect(() => {
    if (!isNew && announcementId) {
      void fetchDetail(announcementId);
    } else {
      // 신규 작성 기본값 세팅: 14일 기간 자동 계산 제안
      const now = new Date();
      const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      setPublishAt(formatDateTimeLocal(now));
      setNoticeEndsAt(formatDateTimeLocal(in14Days));
      setHomeVisible(true);
    }
  }, [id]);

  const formatDateTimeLocal = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const fetchDetail = async (targetId: number) => {
    setLoading(true);
    try {
      const data = await getAdminAnnouncement(targetId);
      setExistingAnnouncement(data);
      setTitle(data.title);
      setSummary(data.summary);
      setBody(data.body);
      setImageUrl(data.imageUrl || '');
      setImageAlt(data.imageAlt || '');
      setCtaLabel(data.ctaLabel || '');
      setCtaTarget(data.ctaTarget || '');
      setPlacement(data.placement || '');
      setHomeVisible(data.homeVisible);
      setFeatureConditionType(data.featureConditionType);
      setFeatureKey(data.featureKey || '');
      setPublishAt(data.publishAt ? data.publishAt.substring(0, 16) : '');
      setNoticeEndsAt(data.noticeEndsAt ? data.noticeEndsAt.substring(0, 16) : '');
    } catch {
      showToast('소식 상세 정보를 불러오지 못했습니다.');
      navigate('/admin/announcements');
    } finally {
      setLoading(false);
    }
  };

  const handle14DaysSuggest = () => {
    const baseDate = publishAt ? new Date(publishAt) : new Date();
    const ends = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    setNoticeEndsAt(formatDateTimeLocal(ends));
    showToast('안내 종료 시각이 게시일 기준 14일 뒤로 설정되었습니다.');
  };

  const buildPayload = (): AnnouncementUpsertRequest => {
    return {
      title: title.trim(),
      summary: summary.trim(),
      body: body.trim(),
      imageUrl: imageUrl.trim() || null,
      imageAlt: imageAlt.trim() || null,
      ctaLabel: ctaLabel.trim() || null,
      ctaTarget: (ctaTarget as AnnouncementActionTarget) || null,
      placement: (placement as AnnouncementPlacement) || null,
      homeVisible,
      featureConditionType,
      featureKey: featureKey.trim() || null,
      publishAt: publishAt ? `${publishAt}:00` : null,
      noticeEndsAt: noticeEndsAt ? `${noticeEndsAt}:00` : null,
    };
  };

  const handleSaveDraft = async () => {
    if (!title.trim() || !summary.trim() || !body.trim()) {
      showToast('제목, 요약, 본문은 필수 입력 사항입니다.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (isNew) {
        const created = await createAdminAnnouncement(payload);
        showToast('소식 초안이 생성되었습니다.');
        navigate(`/admin/announcements/${created.id}`);
      } else if (announcementId) {
        const updated = await updateAdminAnnouncement(announcementId, payload);
        setExistingAnnouncement(updated);
        showToast('소식 내용이 저장되었습니다.');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      showToast(axiosErr.response?.data?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!announcementId) {
      showToast('먼저 초안을 저장한 후 게시해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await publishAdminAnnouncement(announcementId, {
        publishAt: publishAt ? `${publishAt}:00` : undefined,
        noticeEndsAt: noticeEndsAt ? `${noticeEndsAt}:00` : undefined,
      });
      setExistingAnnouncement(updated);
      showToast('소식이 게시(또는 예약)되었습니다.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      showToast(axiosErr.response?.data?.message || '게시 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnd = async () => {
    if (!announcementId) return;
    if (!confirm('정말로 이 소식을 즉시 종료하시겠습니까? 종료 후에는 재게시할 수 없습니다.')) {
      return;
    }
    setSubmitting(true);
    try {
      const updated = await endAdminAnnouncement(announcementId);
      setExistingAnnouncement(updated);
      showToast('소식이 게시 종료되었습니다.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      showToast(axiosErr.response?.data?.message || '종료 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const previewData: Partial<AnnouncementAdminResponse> = {
    title: title || '제목 미리보기',
    summary: summary || '요약 미리보기 내용이 여기에 들어갑니다.',
    body: body || '본문 내용이 여기에 들어갑니다. **강조** 및 목록 등을 확인할 수 있습니다.',
    imageUrl: imageUrl.trim() || undefined,
    imageAlt: imageAlt.trim() || undefined,
    ctaLabel: ctaLabel.trim() || undefined,
    ctaTarget: (ctaTarget as AnnouncementActionTarget) || undefined,
    publishAt: publishAt || undefined,
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-page flex items-center justify-center text-[13px] text-ink-muted">
        소식 정보를 불러오는 중입니다...
      </div>
    );
  }

  const isEnded = existingAnnouncement?.status === 'ENDED';

  return (
    <div className="min-h-dvh bg-page pb-24">
      <SubPageHeader
        title={isNew ? '새 소식 작성' : `소식 편집 #${announcementId}`}
        onBack={() => navigate('/admin/announcements')}
      />

      <main className="w-full max-w-app mx-auto px-4 pt-4">
        {/* 상단 탭 (편집 / 미리보기) */}
        <div className="mb-5 space-y-3">
          <Segmented
            value={activeTab}
            onChange={setActiveTab}
            label="소식 편집 모드"
            options={[{ value: 'edit', label: '내용 편집' }, { value: 'preview', label: '미리보기' }]}
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isNew && !isEnded && (
              <>
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleEnd()}
                  variant="line" size="sm" className="min-h-11 focus-ring"
                >
                  게시 종료
                </Button>
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handlePublish()}
                  variant="primary" size="sm" className="min-h-11 focus-ring"
                >
                  <Send className="size-3.5" />
                  {existingAnnouncement?.status === 'PUBLISHED' ? '예약/게시 갱신' : '게시하기'}
                </Button>
              </>
            )}
            {!isEnded && (
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void handleSaveDraft()}
                variant={isNew ? 'primary' : 'line'} size="sm" className="min-h-11 focus-ring"
              >
                <Save className="size-4" />
                {isNew ? '초안 생성' : '저장'}
              </Button>
            )}
          </div>
        </div>

        {/* 탭 1: 편집 폼 */}
        {activeTab === 'edit' && (
          <div className="space-y-3.5">
            {isEnded && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700">
                이 소식은 이미 <strong>게시 종료</strong>되었습니다. 수정하거나 다시 게시할 수 없어요.
              </div>
            )}

            {/* 기본 콘텐츠 */}
            <Card className="space-y-4">
              <h3 className="text-[15px] font-bold text-ink border-b border-line pb-2">
                어떤 소식을 전할까요?
              </h3>

              <div>
                <label className="block text-[12.5px] font-bold text-ink-secondary mb-1">
                  소식 제목 *
                </label>
                <input
                  type="text"
                  maxLength={40}
                  disabled={isEnded}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 이제 사진을 붙여넣어 인증해요"
                  className="w-full min-h-input rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                />
                <span className="mt-1 block text-right text-[11px] text-ink-muted">
                  {title.length}/40
                </span>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-ink-secondary mb-1">
                  한 줄 요약 *
                </label>
                <textarea
                  rows={2}
                  maxLength={100}
                  disabled={isEnded}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="예: 복사한 사진을 인증 화면에 바로 붙여넣을 수 있어요."
                  className="w-full min-h-input rounded-xl border border-line bg-white px-3.5 py-2.5 text-[13.5px] focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                />
                <span className="mt-1 block text-right text-[11px] text-ink-muted">
                  {summary.length}/100
                </span>
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-ink-secondary mb-1">
                  자세한 내용 *
                </label>
                <p className="text-[11.5px] text-ink-muted mb-2">
                  소제목은 ##, 핵심 내용은 - 로 시작해 보세요. 목록은 읽기 쉬운 카드로 보여요. (최대 5,000자)
                </p>
                <textarea
                  rows={8}
                  maxLength={5000}
                  disabled={isEnded}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={`## 무엇이 달라졌나요?\n- 복사한 사진을 바로 붙여넣을 수 있어요\n\n## 이렇게 해보세요\n- 사진을 복사하고 인증 화면을 열어 주세요\n- 입력창에 붙여넣으면 준비 끝!`}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-[13px] leading-relaxed focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <div>
                  <label className="block text-[12.5px] font-bold text-ink-secondary mb-1">
                    대표 이미지 URL (선택)
                  </label>
                  <input
                    type="text"
                    disabled={isEnded}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="예: /assets/announcements/feature.png"
                    className="w-full min-h-input rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-ink-secondary mb-1">
                    이미지 대체 텍스트 (이미지 등록 시 필수)
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    disabled={isEnded}
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="시각장애인/스크린리더를 위한 설명"
                    className="w-full min-h-input rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                  />
                </div>
              </div>
            </Card>

            {/* 실행 버튼(CTA) 설정 */}
            <Card className="space-y-4">
              <h3 className="text-[15px] font-bold text-ink border-b border-line pb-2">
                연결 버튼
              </h3>
              <p className="text-[12px] text-ink-muted">
                '확인' 같은 단순 닫기 문구는 금지되며 사전 승인된 내부 목적지만 연결 가능합니다.
              </p>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[12.5px] font-bold text-ink-secondary mb-1">
                    버튼 문구 (최대 30자)
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    disabled={isEnded}
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="예: 인증하러 가기, 모임 만들기"
                    className="w-full min-h-input rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-ink-secondary mb-1">
                    연결할 화면
                  </label>
                  <select
                    disabled={isEnded}
                    value={ctaTarget}
                    onChange={(e) => setCtaTarget(e.target.value as AnnouncementActionTarget | '')}
                    className="w-full min-h-input rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                  >
                    <option value="">설정 안 함 (버튼 미노출)</option>
                    <option value="HOME">홈 화면</option>
                    <option value="CERT_CREATE">인증 작성 화면</option>
                    <option value="REDAY_HISTORY">리데이 내역</option>
                    <option value="GROUP_CREATE">모임 생성</option>
                    <option value="ANNOUNCEMENT_LIST">소식 목록</option>
                    <option value="MY_PAGE">마이페이지</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* 노출 위치 및 일정 */}
            <Card className="space-y-4">
              <h3 className="text-[15px] font-bold text-ink border-b border-line pb-2">
                노출 위치와 일정
              </h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isEnded}
                    checked={homeVisible}
                    onChange={(e) => setHomeVisible(e.target.checked)}
                    className="size-4 rounded accent-primary focus-ring"
                  />
                  <span className="text-[13.5px] font-semibold text-ink">
                    홈에 안내 카드 표시
                  </span>
                </label>

                <div>
                  <label className="block text-[12.5px] font-bold text-ink-secondary mb-1">
                    인라인 화면 노출 위치 (선택)
                  </label>
                  <select
                    disabled={isEnded}
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value as AnnouncementPlacement | '')}
                    className="w-full max-w-xs rounded-xl border border-line px-3.5 py-2 text-[13px] focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                  >
                    <option value="">인라인 노출 안 함</option>
                    <option value="CERT_CREATE">인증 작성 화면 하단</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  <div>
                    <label className="block text-[12.5px] font-bold text-ink-secondary mb-1">
                      게시 시작 일시 (KST)
                    </label>
                    <input
                      type="datetime-local"
                      disabled={isEnded}
                      value={publishAt}
                      onChange={(e) => setPublishAt(e.target.value)}
                      className="w-full min-h-input rounded-xl border border-line bg-white px-3 py-2 text-[13px] focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[12.5px] font-bold text-ink-secondary">
                        안내 종료 일시 (KST)
                      </label>
                      <button
                        type="button"
                        onClick={handle14DaysSuggest}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        14일 뒤로 자동 설정
                      </button>
                    </div>
                    <input
                      type="datetime-local"
                      disabled={isEnded}
                      value={noticeEndsAt}
                      onChange={(e) => setNoticeEndsAt(e.target.value)}
                      className="w-full min-h-input rounded-xl border border-line bg-white px-3 py-2 text-[13px] focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* 조건부 기능 노출 설정 */}
            <Card className="space-y-4">
              <h3 className="text-[15px] font-bold text-ink border-b border-line pb-2">
                공개 대상
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[12.5px] font-bold text-ink-secondary mb-1">
                    기능 제공 조건
                  </label>
                  <select
                    disabled={isEnded}
                    value={featureConditionType}
                    onChange={(e) =>
                      setFeatureConditionType(e.target.value as AnnouncementFeatureConditionType)
                    }
                    className="w-full min-h-input rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                  >
                    <option value="ALL_USERS">전체 사용자</option>
                    <option value="EXPERIMENT_PARTICIPANT">
                      실험 참여자
                    </option>
                    <option value="EXPERIMENT_VARIANT_B">
                      실험군 B 참여자
                    </option>
                  </select>
                </div>
                {featureConditionType !== 'ALL_USERS' && (
                  <div>
                    <label className="block text-[12.5px] font-bold text-ink-secondary mb-1">
                      연결할 실험 ID *
                    </label>
                    <input
                      type="text"
                      disabled={isEnded}
                      value={featureKey}
                      onChange={(e) => setFeatureKey(e.target.value)}
                      placeholder="예: reday-guide-copy-v1"
                      className="w-full min-h-input rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] focus:border-primary focus:ring-[3px] focus:ring-primary-muted focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* 탭 2: 미리보기 (무부작용 격리) */}
        {activeTab === 'preview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              <span className="col-span-2 text-label text-ink-muted mb-1">
                노출 화면
              </span>
              {[
                { id: 'home', label: '홈 안내 카드' },
                { id: 'inline', label: '인라인 안내' },
                { id: 'list', label: '목록 카드' },
                { id: 'detail', label: '상세 화면' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={previewMode === tab.id}
                  onClick={() => setPreviewMode(tab.id as typeof previewMode)}
                  className={`focus-ring min-h-11 rounded-xl px-3 py-2 text-[12.5px] font-bold transition shrink-0 ${
                    previewMode === tab.id
                      ? 'bg-primary text-white'
                      : 'bg-white text-ink-secondary border border-line hover:bg-sunken'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded-[18px]">
              <AnnouncementPreview
                data={previewData}
                mode={previewMode}
                onNavigateCta={(target) => {
                  showToast(target ? '버튼을 누르면 연결한 화면으로 이동해요. 미리보기에서는 이동하지 않아요.' : '연결할 화면을 먼저 선택해 주세요.');
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
