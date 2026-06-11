import { profile } from '../content';

/**
 * Minimal contact form — composes a mailto: draft so the site
 * needs no backend. Swap for your form endpoint if you have one.
 */
export function initContactForm(): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  const sent = document.getElementById('contact-sent');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') ?? '');
    const email = String(data.get('email') ?? '');
    const message = String(data.get('message') ?? '');

    const subject = encodeURIComponent(`Portfolio inquiry from ${name}`);
    const bodyText = encodeURIComponent(`${message}\n\n— ${name}\n${email}`);
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${bodyText}`;

    if (sent) {
      sent.hidden = false;
      setTimeout(() => (sent.hidden = true), 4000);
    }
    form.reset();
  });
}
