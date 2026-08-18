# Remove the email template preview

The email templates have been handed off to the developer team, so the in-app preview gallery is no longer needed.

## What changes

- Remove the "Preview" link from the Email notifications card in Settings. The card itself, the description line, and all notification toggles stay exactly as they are.
- Delete the Email preview page (`/app/email-preview`) and its template mockups.
- Everything else keeps working: notification preferences still save, and the mock email confirmations triggered by cancel-subscription and delete-account flows are untouched.

## Technical notes

- `src/components/settings/NotificationPreferencesCard.tsx`: drop the `Link` to `/app/email-preview` and the now-unused imports (`Link`, `track`'s `email_preview_opened` call).
- Delete `src/routes/_authenticated/app/email-preview.tsx`, `src/components/emails/Templates.tsx`, `src/components/emails/EmailShell.tsx`.
- Keep `src/lib/notifications-mock.ts` — it is still used by the settings dialogs; only the preview-page-specific usage goes away.
- Route tree regenerates automatically after the route file is removed.
