import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  // Payment and auth routes carry PII — never send request bodies or headers.
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies
    if (event.request?.data) delete event.request.data
    return event
  },
})
