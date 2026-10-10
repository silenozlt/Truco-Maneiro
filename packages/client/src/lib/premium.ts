const UNLOCKED_KEY = 'truco-premium-avatars';

export function getUnlockedAvatars(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(UNLOCKED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function unlockAvatar(avatar: string): void {
  if (typeof window === 'undefined') return;
  const current = getUnlockedAvatars();
  if (!current.includes(avatar)) {
    current.push(avatar);
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(current));
  }
}

export function isAvatarUnlocked(avatar: string): boolean {
  return getUnlockedAvatars().includes(avatar);
}
