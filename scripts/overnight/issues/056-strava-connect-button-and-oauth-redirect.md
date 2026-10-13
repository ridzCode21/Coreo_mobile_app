# 056 - Strava connect button and OAuth redirect

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/56 |
| Type | enhancement |
| Size | small |
| Screens |  |
| Labels | enhancement, size:small, area:frontend, area:integrations |

A "Connect with Strava" button that follows Strava's brand guidelines. The OAuth redirect returns to the app, and the app sends the auth code to the backend token-exchange endpoint.

No native module. A browser or webview redirect is enough.

Backend endpoint: issue vipin4250/Self_dev#14, `POST /integrations/strava/exchange/`. Does not reopen vipin4250/Self_dev#14 to vipin4250/Self_dev#17.

---
Moved from vipin4250/Self_dev#36 (private repo, so GitHub could not transfer it). Backend issue numbers above point to vipin4250/Self_dev.

## Definition of done (from the acceptance criteria)

_see the issue body_
