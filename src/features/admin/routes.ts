import type { Href } from 'expo-router';

// Admin screens are generic ([entity]), so their paths are built from data and cannot be checked
// against the typed route list.
export function adminHref(...parts: (string | number)[]): Href {
  return ['/admin', ...parts].join('/') as Href;
}
