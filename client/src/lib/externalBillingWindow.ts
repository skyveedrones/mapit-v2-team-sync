/**
 * Open a neutral window synchronously from a user click, then send it to the
 * Stripe URL after an async tRPC request completes. This avoids popup blockers
 * silently discarding legitimate billing actions.
 */
export function openPendingBillingWindow(): Window | null {
  const popup = window.open("", "_blank");
  if (popup) {
    popup.opener = null;
    popup.document.title = "Opening secure billing portal…";
  }
  return popup;
}

export function navigateToBillingUrl(popup: Window | null, url: string) {
  if (popup && !popup.closed) {
    popup.location.assign(url);
    return;
  }

  // If a browser blocks new tabs, retain a reliable same-tab route instead of
  // leaving the customer with an unresponsive billing button.
  window.location.assign(url);
}

export function closePendingBillingWindow(popup: Window | null) {
  if (popup && !popup.closed) popup.close();
}
