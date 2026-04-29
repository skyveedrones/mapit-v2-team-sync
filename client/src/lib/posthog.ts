import posthog from "posthog-js";

const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com";

export function initializePostHog() {
  if (typeof window === "undefined" || !POSTHOG_API_KEY) {
    return;
  }

  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: "history_change",
  });
}

export { posthog };
