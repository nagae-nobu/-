import { UserAccount, UserRole } from '../types';

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'admin',
    username: 'admin',
    displayName: '管理者 (admin)',
    role: 'admin',
    roleLabel: '管理者',
    description: 'すべての機能を表示。メンテナンス画面でユーザー管理やシステム設定が可能。',
    createdAt: '2026-09-01T00:00:00Z',
    isActive: true
  },
  {
    id: 'user1',
    username: 'user1',
    displayName: '編集者 (user1)',
    role: 'editor',
    roleLabel: '編集者',
    description: 'メンテナンス画面を非表示。書籍の登録、編集、分割、現物点検補正、レビュー等の全編集権限を付与。',
    createdAt: '2026-09-01T00:00:00Z',
    isActive: true
  },
  {
    id: 'user2',
    username: 'user2',
    displayName: '閲覧者 (user2)',
    role: 'viewer',
    roleLabel: '閲覧者',
    description: '編集者と同じ画面を閲覧のみで表示。編集・削除・新規追加の権限なし。',
    createdAt: '2026-09-01T00:00:00Z',
    isActive: true
  },
  {
    id: 'user3',
    username: 'user3',
    displayName: '登録者 (user3)',
    role: 'registrar',
    roleLabel: '登録者',
    description: 'スマホ・タブレット対応の本棚AI点検スキャンのみ表示。タイトル・著者・ISBNの簡易登録専用。',
    createdAt: '2026-09-01T00:00:00Z',
    isActive: true
  }
];

const USERS_STORAGE_KEY = 'bookshelf_accounts_v1';
const CURRENT_USER_KEY = 'bookshelf_current_user_v1';

export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    // Ensure all 4 default roles exist
    const userIds = new Set(parsed.map(u => u.id));
    let hasMissing = false;
    DEFAULT_USERS.forEach(def => {
      if (!userIds.has(def.id)) {
        parsed.push(def);
        hasMissing = true;
      }
    });
    if (hasMissing) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return DEFAULT_USERS;
  }
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users:', err);
  }
}

export function getStoredCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as UserAccount;
    // Verify against current list of users
    const allUsers = getStoredUsers();
    const found = allUsers.find(u => u.id === user.id);
    return found || user;
  } catch {
    return null;
  }
}

export function setStoredCurrentUser(user: UserAccount): void {
  try {
    const updated = {
      ...user,
      lastLoginAt: new Date().toISOString()
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));

    // Update in user list as well
    const allUsers = getStoredUsers();
    const nextUsers = allUsers.map(u => (u.id === user.id ? updated : u));
    saveStoredUsers(nextUsers);
  } catch (err) {
    console.error('Failed to set current user:', err);
  }
}

export function clearStoredCurrentUser(): void {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch (err) {
    console.error('Failed to clear current user:', err);
  }
}

export function canAccessMaintenance(role: UserRole): boolean {
  return role === 'admin';
}

export function canEditBooks(role: UserRole): boolean {
  return role === 'admin' || role === 'editor';
}

export function isRegistrarOnly(role: UserRole): boolean {
  return role === 'registrar';
}

export function isViewerOnly(role: UserRole): boolean {
  return role === 'viewer';
}
