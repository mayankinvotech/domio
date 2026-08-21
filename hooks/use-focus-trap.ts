import { useEffect, useRef } from 'react';

// Trap Tab focus within a container while `active`, and restore focus to the
// previously-focused element when it deactivates/unmounts.
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
) {
  const containerRef = useRef<T>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previousFocus.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    const selectors =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
        (el) => !el.hasAttribute('disabled'),
      );

    focusable()[0]?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const list = focusable();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      previousFocus.current?.focus();
    };
  }, [active]);

  return containerRef;
}
