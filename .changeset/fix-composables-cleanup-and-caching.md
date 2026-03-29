---
"@praxisjs/composables": patch
---

All composables now cache their view object so calling `setup()` multiple times returns the same signals. `KeyCombo` gains meta key support and validates that at least one non-modifier key is present. `Clipboard` clears its reset timer on unmount. `Geolocation` ignores success/error callbacks after unmount. `Pagination` throws when `pageSize` is zero or negative.
