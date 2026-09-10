import React, { useState } from 'react';
import { UserAccount, UserRole } from '../types';
import { ShieldCheck, Edit3, Eye, Camera, ArrowRight, BookOpen, CheckCircle2, UserCheck } from 'lucide-react';

interface LoginViewProps {
  users: UserAccount[];
  onLogin: (user: UserAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, onLogin }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('admin');

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      onLogin(selectedUser);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-5 h-5 text-[#8C5D39]" />;
      case 'editor':
        return <Edit3 className="w-5 h-5 text-[#3A6B48]" />;
      case 'viewer':
        return <Eye className="w-5 h-5 text-[#4A6278]" />;
      case 'registrar':
        return <Camera className="w-5 h-5 text-[#7B4E7A]" />;
      default:
        return <UserCheck className="w-5 h-5 text-[#5D6D5F]" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-[#FAF0E6] text-[#8C5D39] border-[#E8D4C0]';
      case 'editor':
        return 'bg-[#EDF5EF] text-[#2D5A34] border-[#C3DCC7]';
      case 'viewer':
        return 'bg-[#F0F4F8] text-[#32526E] border-[#C9D7E3]';
      case 'registrar':
        return 'bg-[#F9EFF9] text-[#713B70] border-[#E8CEE7]';
      default:
        return 'bg-[#F7F3EE] text-[#786C5E] border-[#E8E1D7]';
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Subtle Accent */}
      <div className="max-w-md w-full space-y-6">
        {/* App Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#5D6D5F] text-white shadow-md ring-4 ring-[#5D6D5F]/15 mb-2">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-[#3E362E] tracking-tight">
            本棚書籍管理アプリ
          </h1>
          <p className="text-xs text-[#786C5E] max-w-sm mx-auto">
            AI背表紙マルチスキャン ＆ 蔵書点検システム
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl border border-[#E8E1D7] shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#EFE9E0] pb-4">
            <h2 className="text-base font-bold font-serif text-[#3E362E]">
              アカウントログイン
            </h2>
            <p className="text-xs text-[#786C5E] mt-1">
              プルダウンメニューからログインするアカウントを選択してください。
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* User Dropdown Selection (as requested: adminからuser3までのプルダウンメニュー) */}
            <div className="space-y-2">
              <label htmlFor="user-select-dropdown" className="block text-xs font-bold text-[#3E362E]">
                ログインアカウント選択（プルダウン）
              </label>
              <div className="relative">
                <select
                  id="user-select-dropdown"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full text-sm font-medium px-3.5 py-2.5 bg-[#FDFBF7] border-2 border-[#D9C5B2] focus:border-[#5D6D5F] rounded-xl text-[#3E362E] focus:outline-none transition-colors cursor-pointer shadow-2xs"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} — 【{u.roleLabel}】
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected User Detailed Permission Box */}
            {selectedUser && (
              <div className="p-4 rounded-xl border bg-[#FDFBF7] border-[#E8E1D7] space-y-2.5 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(selectedUser.role)}
                    <span className="text-xs font-bold text-[#3E362E]">
                      {selectedUser.displayName}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadge(selectedUser.role)}`}>
                    {selectedUser.roleLabel}
                  </span>
                </div>
                <p className="text-xs text-[#5D5043] leading-relaxed">
                  {selectedUser.description}
                </p>

                {/* Role Specific Key Features List */}
                <div className="pt-2 border-t border-[#EFE9E0] text-[11px] text-[#786C5E] space-y-1">
                  {selectedUser.role === 'admin' && (
                    <div className="flex items-center space-x-1.5 text-[#8C5D39] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>全機能利用可能 + メンテナンス画面でのユーザー管理</span>
                    </div>
                  )}
                  {selectedUser.role === 'editor' && (
                    <div className="flex items-center space-x-1.5 text-[#2D5A34] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>蔵書管理・点検・編集・分割（※メンテナンス画面は非表示）</span>
                    </div>
                  )}
                  {selectedUser.role === 'viewer' && (
                    <div className="flex items-center space-x-1.5 text-[#32526E] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>編集者と同じ画面を閲覧専用で表示（編集・削除不可）</span>
                    </div>
                  )}
                  {selectedUser.role === 'registrar' && (
                    <div className="flex items-center space-x-1.5 text-[#713B70] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>スマホ・タブレット向けAIスキャン専用（タイトル/著者/ISBN簡易登録）</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              className="w-full py-2.5 px-4 bg-[#5D6D5F] hover:bg-[#4D5C4F] active:bg-[#3E4C40] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{selectedUser ? `${selectedUser.roleLabel}としてログイン` : 'ログイン'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Click Account Switcher for Testers */}
          <div className="pt-4 border-t border-[#EFE9E0] space-y-2.5">
            <p className="text-[11px] font-bold text-[#786C5E] uppercase tracking-wider text-center">
              ワンクリックでアカウント切替（テスト用）
            </p>
            <div className="grid grid-cols-2 gap-2">
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(u.id);
                    onLogin(u);
                  }}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedUserId === u.id
                      ? 'border-[#5D6D5F] bg-[#EDF2EE]/60 ring-1 ring-[#5D6D5F]'
                      : 'border-[#E8E1D7] bg-white hover:bg-[#FDFBF7]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#3E362E]">{u.username}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${getRoleBadge(u.role)}`}>
                      {u.roleLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#786C5E] mt-1 truncate">
                    {u.role === 'admin' ? '全機能+ユーザー管理' :
                     u.role === 'editor' ? '編集権限あり' :
                     u.role === 'viewer' ? '閲覧専用' : 'AI簡易スキャン'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-[#A99C8E]">
          ※ログイン後もヘッダー右上の「アカウント切替」からいつでも別権限に変更できます
        </p>
      </div>
    </div>
  );
};
