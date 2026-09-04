# Roadmap

- [x] Registration modal close bug
  - [x] Temporary diagnostics captured trace (handleOpenChange -> closeModal -> provider modalOpen=false)
  - [x] Fix: dialog owns its own visibility, parent state still set false, openSeq forces reopen
  - [x] Verified: dialogs 0 after close, body restored, intent preserved, no navigation, reopen twice
  - [x] Diagnostics removed
