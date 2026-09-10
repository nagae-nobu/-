import React, { useState } from 'react';
import { UserAccount, UserRole } from '../types';
import { 
  Users, 
  ShieldCheck, 
  Edit3, 
  Eye, 
  Camera, 
  Plus, 
  Check, 
  X, 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { DEFAULT_USERS, saveStoredUsers } from '../utils/auth';

interface UserManagementViewProps {
  users: UserAccount[];
  onUpdateUsers: (users: UserAccount[]) => void;
  currentUser: UserAccount;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  onUpdateUsers,
  currentUser
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>('editor');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  // New user modal/form
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newDisplayName, setNewDisplayName] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('editor');
  const [newDescription, setNewDescription] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

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

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-[#8C5D39]" />;
      case 'editor':
        return <Edit3 className="w-4 h-4 text-[#2D5A34]" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-[#32526E]" />;
      case 'registrar':
        return <Camera className="w-4 h-4 text-[#713B70]" />;
    }
  };

  const startEdit = (user: UserAccount) => {
    setEditingUserId(user.id);
    setEditDisplayName(user.displayName);
    setEditRole(user.role);
    setEditDescription(user.description);
    setEditIsActive(user.isActive);
  };

  const saveEdit = (userId: string) => {
    const roleLabels: Record<UserRole, string> = {
      admin: '管理者',
      editor: '編集者',
      viewer: '閲覧者',
      registrar: '登録者'
    };

    const nextUsers = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          displayName: editDisplayName.trim() || u.displayName,
          role: editRole,
          roleLabel: roleLabels[editRole],
          description: editDescription.trim() || u.description,
          isActive: editIsActive
        };
      }
      return u;
    });

    onUpdateUsers(nextUsers);
    saveStoredUsers(nextUsers);
    setEditingUserId(null);
    setFeedbackMsg(`ユーザー「${userId}」の設定を保存しました。`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUsername.trim().toLowerCase();
    if (!cleanUsername) return;

    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      alert('そのユーザーIDは既に使用されています。');
      return;
    }

    const roleLabels: Record<UserRole, string> = {
      admin: '管理者',
      editor: '編集者',
      viewer: '閲覧者',
      registrar: '登録者'
    };

    const newUser: UserAccount = {
      id: cleanUsername,
      username: cleanUsername,
      displayName: newDisplayName.trim() || cleanUsername,
      role: newRole,
      roleLabel: roleLabels[newRole],
      description: newDescription.trim() || `${roleLabels[newRole]}アカウント`,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    const nextUsers = [...users, newUser];
    onUpdateUsers(nextUsers);
    saveStoredUsers(nextUsers);

    setIsAddUserOpen(false);
    setNewUsername('');
    setNewDisplayName('');
    setNewDescription('');
    setFeedbackMsg(`新ユーザー「${newUser.displayName}」を追加しました。`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleResetToDefaults = () => {
    if (!window.confirm('ユーザー一覧を初期設定（admin, user1, user2, user3）に戻しますか？')) {
      return;
    }
    onUpdateUsers(DEFAULT_USERS);
    saveStoredUsers(DEFAULT_USERS);
    setFeedbackMsg('初期ユーザーアカウントを復元しました。');
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-[#FAF0E6] border border-[#E8D4C0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5 text-[#8C5D39]">
          <ShieldCheck className="w-5 h-5 shrink-0 text-[#8C5D39]" />
          <div>
            <p className="font-bold">
              ユーザー管理（管理者: admin 専用画面）
            </p>
            <p className="text-[#5D5043] mt-0.5">
              各アカウントの権限（管理者・編集者・閲覧者・登録者）および画面のアクセス制御を管理します。
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D9C5B2] text-[#786C5E] hover:text-[#3E362E] cursor-pointer flex items-center space-x-1"
            title="admin, user1, user2, user3の初期状態に戻す"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>初期ユーザー復元</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#5D6D5F] hover:bg-[#4D5C4F] text-white font-semibold cursor-pointer shadow-2xs flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新規ユーザー追加</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-[#EDF5EF] border border-[#BED2C1] rounded-xl text-xs text-[#2D5A34] flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Accounts List Table */}
      <div className="bg-white rounded-xl border border-[#E8E1D7] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EFE9E0] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#3E362E] font-serif uppercase tracking-wider flex items-center space-x-2">
            <Users className="w-4 h-4 text-[#5D6D5F]" />
            <span>登録アカウント一覧（{users.length}名）</span>
          </h3>
          <span className="text-[11px] text-[#786C5E]">
            現在のログイン: <strong className="text-[#3E362E]">{currentUser.displayName}</strong>
          </span>
        </div>

        <div className="divide-y divide-[#EFE9E0]">
          {users.map(user => {
            const isEditing = editingUserId === user.id;

            return (
              <div key={user.id} className="p-4 sm:p-5 transition-colors hover:bg-[#FDFBF7]">
                {isEditing ? (
                  /* Edit Form */
                  <div className="space-y-3 bg-[#F7F3EE]/50 p-4 rounded-xl border border-[#D9C5B2]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#3E362E]">
                        「{user.username}」の権限・設定変更
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingUserId(null)}
                        className="text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
                      >
                        キャンセル
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#786C5E] mb-1">
                          表示名 *
                        </label>
                        <input
                          type="text"
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          className="w-full text-xs px-3 py-1.5 bg-white border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#786C5E] mb-1">
                          権限ロール *
                        </label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as UserRole)}
                          className="w-full text-xs px-3 py-1.5 bg-white border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                        >
                          <option value="admin">管理者 (admin) — 全機能 + ユーザー管理</option>
                          <option value="editor">編集者 (editor) — メンテナンス非表示 + 全編集</option>
                          <option value="viewer">閲覧者 (viewer) — 編集者と同じ画面を閲覧のみ</option>
                          <option value="registrar">登録者 (registrar) — スマホAIスキャンのみ</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#786C5E] mb-1">
                        説明・備考
                      </label>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-white border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center space-x-2 text-xs text-[#3E362E] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          className="rounded text-[#5D6D5F]"
                        />
                        <span>アカウントを有効化</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => saveEdit(user.id)}
                        className="px-4 py-1.5 bg-[#5D6D5F] hover:bg-[#4D5C4F] text-white text-xs font-bold rounded-lg cursor-pointer shadow-2xs"
                      >
                        変更を保存
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Row */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F7F3EE] border border-[#E8E1D7] flex items-center justify-center shrink-0 mt-0.5">
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-[#3E362E]">
                            {user.displayName}
                          </h4>
                          <span className="text-xs font-mono text-[#786C5E]">
                            (@{user.username})
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md border ${getRoleBadge(user.role)}`}>
                            {user.roleLabel}
                          </span>
                          {user.isActive ? (
                            <span className="text-[10px] text-[#2D5A34] bg-[#EDF5EF] px-1.5 py-0.2 rounded">
                              有効
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#9A392F] bg-[#FAF0ED] px-1.5 py-0.2 rounded">
                              無効
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#786C5E] leading-relaxed">
                          {user.description}
                        </p>
                        {user.lastLoginAt && (
                          <p className="text-[10px] text-[#A99C8E]">
                            最終ログイン: {new Date(user.lastLoginAt).toLocaleString('ja-JP')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(user)}
                        className="px-3 py-1 bg-[#F7F3EE] hover:bg-[#EAE4DB] text-[#3E362E] text-xs font-medium rounded-lg border border-[#D9C5B2] transition-colors cursor-pointer"
                      >
                        設定変更
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Permission Matrix Table */}
      <div className="bg-[#FDFBF7] rounded-xl border border-[#E8E1D7] p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[#3E362E] font-serif uppercase tracking-wider flex items-center space-x-2">
          <Info className="w-4 h-4 text-[#5D6D5F]" />
          <span>アカウント権限マトリクス（機能別の権限対応表）</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D9C5B2] bg-[#F7F3EE] text-[#5D5043]">
                <th className="py-2.5 px-3 font-bold">機能 / 画面</th>
                <th className="py-2.5 px-3 font-bold text-center">admin<br/><span className="text-[10px] font-normal font-sans">管理者</span></th>
                <th className="py-2.5 px-3 font-bold text-center">user1<br/><span className="text-[10px] font-normal font-sans">編集者</span></th>
                <th className="py-2.5 px-3 font-bold text-center">user2<br/><span className="text-[10px] font-normal font-sans">閲覧者</span></th>
                <th className="py-2.5 px-3 font-bold text-center">user3<br/><span className="text-[10px] font-normal font-sans">登録者</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E1D7] text-[#3E362E]">
              <tr>
                <td className="py-2 px-3 font-medium">蔵書・本棚一覧（棚表示・検索）</td>
                <td className="py-2 px-3 text-center text-[#2D5A34] font-bold">◯ 閲覧・編集</td>
                <td className="py-2 px-3 text-center text-[#2D5A34] font-bold">◯ 閲覧・編集</td>
                <td className="py-2 px-3 text-center text-[#32526E] font-bold">◯ 閲覧のみ</td>
                <td className="py-2 px-3 text-center text-[#A99C8E]">✕ 非表示</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">書籍登録・手動追加・情報修正・削除</td>
                <td className="py-2 px-3 text-center text-[#2D5A34] font-bold">◯ 可能</td>
                <td className="py-2 px-3 text-center text-[#2D5A34] font-bold">◯ 可能</td>
                <td className="py-2 px-3 text-center text-[#9A392F]">✕ 不可</td>
                <td className="py-2 px-3 text-center text-[#A99C8E]">✕ （スキャン登録のみ）</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">本棚AI点検スキャン（通常マルチ枠・分割・詳細）</td>
                <td className="py-2 px-3 text-center text-[#2D5A34] font-bold">◯ 利用可能</td>
                <td className="py-2 px-3 text-center text-[#2D5A34] font-bold">◯ 利用可能</td>
                <td className="py-2 px-3 text-center text-[#32526E] font-bold">◯ 閲覧可能</td>
                <td className="py-2 px-3 text-center text-[#A99C8E]">✕ （簡易版に切替）</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">スマホ・タブレット専用AI簡易OCRスキャン（表題・著者・ISBN）</td>
                <td className="py-2 px-3 text-center text-[#786C5E]">―</td>
                <td className="py-2 px-3 text-center text-[#786C5E]">―</td>
                <td className="py-2 px-3 text-center text-[#786C5E]">―</td>
                <td className="py-2 px-3 text-center text-[#713B70] font-bold">◯ 専用表示</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">蔵書点検集計・レポート ＆ CSVエクスポート</td>
                <td className="py-2 px-3 text-center text-[#2D5A34] font-bold">◯ 利用可能</td>
                <td className="py-2 px-3 text-center text-[#2D5A34] font-bold">◯ 利用可能</td>
                <td className="py-2 px-3 text-center text-[#32526E] font-bold">◯ 閲覧可能</td>
                <td className="py-2 px-3 text-center text-[#A99C8E]">✕ 非表示</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">読書メモ・レビュー登録・評価</td>
                <td className="py-2 px-3 text-center text-[#2D5A34] font-bold">◯ 登録・編集</td>
                <td className="py-2 px-3 text-center text-[#2D5A34] font-bold">◯ 登録・編集</td>
                <td className="py-2 px-3 text-center text-[#32526E] font-bold">◯ 閲覧のみ</td>
                <td className="py-2 px-3 text-center text-[#A99C8E]">✕ 非表示</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">メンテナンス画面（一括更新・CSVインポート・ログ）</td>
                <td className="py-2 px-3 text-center text-[#2D5A34] font-bold">◯ 利用可能</td>
                <td className="py-2 px-3 text-center text-[#9A392F] font-bold">✕ 非表示</td>
                <td className="py-2 px-3 text-center text-[#9A392F] font-bold">✕ 非表示</td>
                <td className="py-2 px-3 text-center text-[#9A392F] font-bold">✕ 非表示</td>
              </tr>
              <tr className="bg-[#FAF0E6]/50">
                <td className="py-2.5 px-3 font-bold text-[#8C5D39]">ユーザー管理（権限設定・アカウント追加）</td>
                <td className="py-2.5 px-3 text-center text-[#8C5D39] font-bold">◯ 管理者のみ</td>
                <td className="py-2.5 px-3 text-center text-[#9A392F]">✕</td>
                <td className="py-2.5 px-3 text-center text-[#9A392F]">✕</td>
                <td className="py-2.5 px-3 text-center text-[#9A392F]">✕</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-[#D9C5B2] shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#EFE9E0] pb-3">
              <h3 className="text-sm font-bold font-serif text-[#3E362E] flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#5D6D5F]" />
                <span>新規ユーザーアカウント追加</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-[#786C5E] hover:text-[#3E362E] p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#5D5043] mb-1">
                  ユーザーID (半角英数字) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: user4, staff1"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5D5043] mb-1">
                  表示名 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 図書室スタッフ (user4)"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5D5043] mb-1">
                  権限ロール *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                >
                  <option value="editor">編集者 (editor) — メンテナンス非表示、その他全編集</option>
                  <option value="viewer">閲覧者 (viewer) — 編集者画面と同じ、閲覧のみ</option>
                  <option value="registrar">登録者 (registrar) — スマホAIスキャンのみ</option>
                  <option value="admin">管理者 (admin) — 全機能 + ユーザー管理</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#5D5043] mb-1">
                  説明・備考
                </label>
                <input
                  type="text"
                  placeholder="例: 担当業務や所属"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#EFE9E0]">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5D6D5F] hover:bg-[#4D5C4F] text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
