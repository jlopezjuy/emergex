/**
 * Utility to sanitize inputs globally.
 * M3 Fix: Intercepts all input events and prevents XSS payload characters (<, >)
 * from being bound to the NgModel/form control.
 */
export function initializeGlobalSanitizer(): void {
  document.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      if (
        target.type === 'text' ||
        target.type === 'email' ||
        target.type === 'search' ||
        target.type === 'password' ||
        target.tagName === 'TEXTAREA'
      ) {
        const sanitized = target.value.replace(/[<>]/g, '');
        if (sanitized !== target.value) {
          target.value = sanitized;
          // Notify Angular that the value has changed so ngModel updates
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  });
}
