# Centralny backend licencji (Apps Script)

Apps Script i wskazany Arkusz Google są centralnym źródłem prawdy: klient wysyła żądania, ale nie ustala sam statusu licencji ani limitów. Dane lokalne są wyłącznie kopią odzyskiwania lub pamięcią offline i nie nadają uprawnień.

## Arkusze

`Companies`: `companyId, name, adminEmail, licenseStatus, trialDays, trialStartedAt, trialEndsAt, paidEndsAt, blocked, adminDeviceLimit, driverLimit, driverDeviceLimit, updatedAt`.

`Drivers`: `driverId, companyId, name, phone, email, status, activationTokenHash, activationExpiresAt, activatedAt, updatedAt`.

`DriverSessions`: `tokenHash, refreshTokenHash, companyId, driverId, deviceId, expiresAt, refreshExpiresAt, absoluteExpiresAt, revokedAt, createdAt, lastSeenAt`.

`Vehicles`: `companyId, vehiclesJson, updatedAt`.

`Devices`: `deviceId, companyId, userId, role, fingerprintHash, activatedAt, lastSeenAt, releasedAt`.

`LicenseHistory`: `eventId, companyId, type, actorId, payloadJson, occurredAt`.

## Endpointy JSON

- `POST /companies`, `PATCH /companies/{id}` — właściciel systemu.
- `GET /companies`, `GET /companies/{id}` — panel właściciela.
- `POST /companies/{id}/license` — limity, trial, płatna licencja, blokada.
- `POST /drivers`, `PATCH /drivers/{id}`, `POST /drivers/{id}/activation`. Link aktywacyjny jest jednorazowy i wygasa po 48 godzinach.
- `POST /activations/driver` i `POST /activations/admin` — sprawdzają limity i atomowo zapisują urządzenie; odpowiedź zawiera decyzję serwera.
- `POST refreshDriverSession` — rotuje token dostępowy i token odnowienia po sprawdzeniu aktywnego urządzenia, fingerprintu, kierowcy oraz licencji.
- `DELETE /devices/{deviceId}` — zwolnienie urządzenia.

Każda odpowiedź ma format `{ok:true,data:{company,license,devices}}` albo `{ok:false,error:{code,message}}`. Tokeny aktywacyjne i sesyjne są przechowywane wyłącznie jako skróty. Sesja dostępowa kierowcy jest ważna 24 godziny, token odnowienia 30 dni od ostatniej rotacji, a maksymalny czas jednej aktywacji wynosi 180 dni. Panel właściciela wymaga uwierzytelnienia i kontroli roli po stronie Apps Script. Fingerprint jest hashowany i stanowi dodatkowy sygnał związania sesji z urządzeniem; podstawą kontroli pozostają losowe tokeny i stan urządzenia w backendzie.
