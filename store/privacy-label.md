# App Store privacy label and age rating answers

Answered from what the app and its service do (legal/privacy.md). Submit these in App Store Connect as written. If a dependency, a data flow or a retention period changes, this file and legal/privacy.md change in the same pull request.

## Data used to track you

None. Tracking: No for every row below.

## Data collected

| Apple category | Data type | What it is | Purpose | Linked to user | Tracking |
| --- | --- | --- | --- | --- | --- |
| User Content | Other User Content | Chat messages (sent to the AI providers), the paid chat memory summary, words written for a made-for-you session | App Functionality | Yes (install id) | No |
| Identifiers | Device ID | The anonymous install id, created the first time someone chats | App Functionality | Yes | No |
| Identifiers | User ID | RevenueCat's anonymous app user id | App Functionality | Yes | No |
| Purchases | Purchase History | Subscription receipts read through Apple and RevenueCat | App Functionality | Yes | No |
| Usage Data | Product Interaction | Messages sent per install per day, for the free and paid limits (deleted within 48 hours) | App Functionality | Yes | No |
| Sensitive Info | Sensitive Info | The door chosen and the chat voice travel with each chat message and can suggest religious belief or race | App Functionality | Yes | No |

## Data not collected

| Apple category | Answer |
| --- | --- |
| Contact Info (name, email, phone, address, other) | Not collected. The app never asks for them. |
| Health & Fitness | Not collected. |
| Financial Info | Not collected. Apple handles payment. |
| Location (precise and coarse) | Not collected. The hashed IP address is used for rate limits, not location. |
| Contacts | Not collected. |
| User Content: Emails or Text Messages, Photos or Videos, Gameplay Content, Customer Support | Not collected. |
| User Content: Audio Data | Not collected. |
| Browsing History, Search History | Not collected. Bible searches run on the phone. |
| Usage Data: Advertising Data, Other Usage Data | Not collected. |
| Diagnostics (crash, performance, other) | Not collected. There is no crash or analytics SDK, and RevenueCat diagnostics are off. |
| Surroundings, Body | Not collected. |
| Other Data | Not collected. Journal, saved verses, highlights, streak and birth year stay on the phone. |

## Age rating questionnaire

| Question | Answer |
| --- | --- |
| Mature or suggestive themes, violence, horror, profanity, sexual content, nudity | None |
| Alcohol, tobacco or drug use | None |
| Gambling, simulated gambling, contests | None |
| Medical or treatment information | None |
| Health or wellness topics | Yes: sleep and rest sessions, with no medical claims |
| Messaging and chat between users | No. The only chat is with AI, which is labeled AI. |
| User-generated content shown publicly | No |
| Advertising | No |
| Unrestricted web access | No |
| Dating and Relationships | No |
| Shared Location | No |
| Parental controls | No. Purchases by teens go through Apple's Ask to Buy. |
| Age assurance | Yes: a birth-year step before anything else. Under 13 has no chat. |
| Override to higher age rating | 13+ |
