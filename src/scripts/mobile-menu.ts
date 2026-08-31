/** The native dialog contains keyboard focus and makes the page behind it inert. */
export function initializeMobileMenu(doc: Document = document, host: Window = window) {
  const trigger = doc.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = doc.querySelector<HTMLDialogElement>('#mobile-navigation');
  const header = doc.querySelector<HTMLElement>('.site-header');
  if (!trigger || !menu || !header || typeof menu.showModal !== 'function') return () => {};

  const root = doc.documentElement;
  const mobile = host.matchMedia('(max-width: 760px)');
  const abort = new AbortController();
  const options = { signal: abort.signal };

  const sync = () => {
    trigger.setAttribute('aria-expanded', String(menu.open));
    root.toggleAttribute('data-mobile-menu-open', menu.open);
  };
  const close = () => {
    if (menu.open) menu.close();
    sync();
  };
  const open = () => {
    if (!mobile.matches || menu.open) return;
    menu.showModal();
    sync();
  };
  const resized = () => {
    if (!mobile.matches) close();
  };

  trigger.addEventListener('click', open, options);
  menu.querySelector('[data-menu-close]')?.addEventListener('click', close, options);
  menu.addEventListener('close', sync, options);
  // Handle Escape immediately, before the browser queues its close event.
  menu.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  }, options);
  menu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  }, options);
  // Close on link activation, including a link to the current page.
  for (const link of menu.querySelectorAll('a[href]')) link.addEventListener('click', close, options);
  mobile.addEventListener('change', resized, options);
  doc.addEventListener('astro:before-preparation', close, options);
  doc.addEventListener('astro:before-swap', close, options);
  host.addEventListener('pagehide', close, options);
  host.addEventListener('pageshow', close, options);

  root.dataset.mobileMenuReady = 'true';
  header.dataset.mobileMenuReady = 'true';
  trigger.hidden = false;
  sync();

  return () => {
    close();
    abort.abort();
    trigger.hidden = true;
    delete header.dataset.mobileMenuReady;
    delete root.dataset.mobileMenuReady;
  };
}
