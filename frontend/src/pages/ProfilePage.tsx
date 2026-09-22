import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MobileLayout } from '../components/MobileLayout';
import { ArrowLeft, User as UserIcon, LogOut, Check, Loader2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUserNickname, logout } = useAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState<string>(user?.nickname || '');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setErrorMsg('닉네임은 2자 이상 20자 이하로 입력해 주세요.');
      return;
    }

    setIsUpdating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await updateUserNickname(trimmed);
      setSuccessMsg('닉네임이 성공적으로 변경되었습니다.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      console.error('Failed to update nickname:', err);
      setErrorMsg('닉네임 수정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <MobileLayout>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate('/groups')}
          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-800">프로필 설정</h1>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* 프로필 아바타 영역 */}
          <div className="flex flex-col items-center py-4">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.nickname}
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 mb-3"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                <UserIcon className="w-10 h-10" />
              </div>
            )}
            <span className="text-xs text-slate-400">카카오 계정 연동됨</span>
          </div>

          {/* 닉네임 수정 폼 */}
          <form onSubmit={handleUpdate} className="bg-white border border-slate-200 rounded-xl p-4">
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              닉네임 설정
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setErrorMsg('');
                }}
                maxLength={20}
                className="flex-1 px-3 py-2 text-base bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={isUpdating || nickname.trim() === user?.nickname}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-medium rounded-lg transition active:scale-95 flex items-center gap-1"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '저장'}
              </button>
            </div>

            {errorMsg && <p className="text-xs text-red-500 mt-2">{errorMsg}</p>}
            {successMsg && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {successMsg}
              </p>
            )}
          </form>
        </div>

        {/* 로그아웃 버튼 */}
        <button
          onClick={logout}
          className="w-full py-3 border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-red-600 font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>로그아웃</span>
        </button>
      </div>
    </MobileLayout>
  );
};
