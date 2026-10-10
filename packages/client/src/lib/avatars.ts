export const FREE_AVATARS = [
  '🤠', '😎', '🧐', '🤓', '😏', '🥸',
  '👨', '👩', '🧔', '👴', '👵', '🧑',
];

export const PREMIUM_AVATARS = [
  '🦁', '🐂', '🦅', '🐍', '🦊', '🐺',
  '⭐', '🔥', '💎', '🃏', '👑', '🎯',
];

export const AVATARS = [...FREE_AVATARS, ...PREMIUM_AVATARS];

const AVATAR_KEY = 'truco-avatar';

export function loadAvatar(): string {
  if (typeof window === 'undefined') return AVATARS[0];
  return localStorage.getItem(AVATAR_KEY) || AVATARS[0];
}

export function saveAvatar(avatar: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AVATAR_KEY, avatar);
}
