/** "Sara Ali" to "SA", "Madonna" to "M", nothing usable to "?". Up to two letters, upper case. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? words[0].slice(0, 1) : words[0].slice(0, 1) + words[words.length - 1].slice(0, 1);
  return letters.toUpperCase();
}

export const AVATAR_TONES = 5;

/** A stable number from 0 to 4 for a person, so a list of avatars has some variety but each person keeps their colour. */
export function avatarTone(key: string): number {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % AVATAR_TONES;
}
