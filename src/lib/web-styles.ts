import { Platform } from 'react-native';

// The little CSS the web needs and React Native cannot express: a visible keyboard focus ring, the pointer cursor on
// things you can press, and a gentle hover on buttons and rows. Added once; native does nothing.
const css = `
:focus-visible { outline: 2px solid rgb(1 92 147); outline-offset: 2px; }
[role="button"], [role="link"], [role="tab"], [role="radio"], [role="checkbox"], [role="menuitem"] { cursor: pointer; }
[aria-disabled="true"] { cursor: not-allowed; }
@media (hover: hover) {
  [role="button"]:not([aria-disabled="true"]):hover, [role="link"]:hover, [role="tab"]:hover, [role="radio"]:hover, [role="checkbox"]:hover, [role="menuitem"]:hover { filter: brightness(0.97); }
}
`;

export function addWebStyles() {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || document.getElementById('web-styles')) return;
  const style = document.createElement('style');
  style.id = 'web-styles';
  style.textContent = css;
  document.head.appendChild(style);
}
