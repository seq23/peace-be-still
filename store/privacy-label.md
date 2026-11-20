# App Store privacy answers — draft

Do not submit these answers until the completed app, SDKs and provider retention and use have been audited. Apple requires disclosures to include third-party partners; an installation identifier is not automatically unlinked from a person or device.

| Candidate data | Purpose | Linked / tracking |
| --- | --- | --- |
| Chat text and paid memory | App functionality and personalization | Treat as linked to the installation; verify provider retention and whether any provider tracks |
| Installation identifier, IP address and usage counts | App functionality, security and rate limits | Treat as linked; verify tracking with each provider |
| Purchase history and identifiers processed by Apple and RevenueCat | App functionality and subscription access | Treat as linked; verify partner disclosures and tracking |
| Journal, saved verses and voice recordings | On device as designed | Verify no off-device collection, backups or diagnostics include content |
| Diagnostics | Undetermined | Audit the final build and SDKs before answering |

No advertising or tracking is intended. This intention is not proof of the practices of each SDK or provider. Review [Apple's privacy details guidance](https://developer.apple.com/app-store/app-privacy-details/) and complete each applicable data type, purpose, linkage and tracking answer after the audit.
