# 054 - iOS: HealthKit read and background sync

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/54 |
| Type | enhancement |
| Size | big |
| Screens |  |
| Labels | enhancement, size:big, area:frontend, area:integrations |

Native iOS module. Request HealthKit read permission for the metrics the backend already accepts (steps, sleep, HRV, weight, workouts). Read new samples since the last sync and POST them to the HealthKit ingestion endpoint.

Requires a physical iPhone to test. The Apple Developer Program fee applies at TestFlight or App Store time, not for local development.

Backend endpoint: issue vipin4250/Self_dev#15, `POST /insights/import/` for Apple Health. Does not reopen vipin4250/Self_dev#14 to vipin4250/Self_dev#17.

---
Moved from vipin4250/Self_dev#34 (private repo, so GitHub could not transfer it). Backend issue numbers above point to vipin4250/Self_dev.

## Definition of done (from the acceptance criteria)

_see the issue body_
