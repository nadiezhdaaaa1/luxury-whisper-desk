# Roadmap

- [ ] Registration modal close bug
  - [ ] Temporary diagnostics: RegistrationModal.handleOpenChange, usePlanFlow.closeModal, provider render modalOpen
  - [ ] Capture trace on production build, report which callbacks fire + next-render modalOpen
  - [ ] Ship fix; parent state must end up false (reopen-on-second-click assertion)
  - [ ] Verify: dialogs 0, body pointer-events/overflow restored, plan intent preserved, no navigation
  - [ ] Remove diagnostics
