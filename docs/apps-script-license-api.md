# Centralny backend licencji (Apps Script)

Apps Script i wskazany Arkusz Google są centralnym źródłem prawdy: klient wysyła żądania, ale nie ustala sam statusu licencji ani limitów. Dane lokalne są wyłącznie kopią odzyskiwania lub pamięcią offline i nie nadają uprawnień.

## Arkusze

`Companies`: `companyId, name, adminEmail, licenseStatus, trialDays, trialStartedAt, trialEndsAt, paidEndsAt, blocked, adminDeviceLimit, driverLimit, driverDeviceLimit, updatedAt`.

`Drivers`: `driverId, companyId, name, phone, email, status, activationTokenHash, activationExpiresAt, activatedAt, updatedAt`.

`DriverSessions`: `tokenHash, companyId, driverId, deviceId, expiresAt, revokedAt, createdAt, lastSeenAt`.

`Vehicles`: `companyId, vehiclesJson, updatedAt`.

`Devices`: `deviceId, companyId, userId, role, fingerprintHash, activatedAt, lastSeenAt, releasedAt`.

`LicenseHistory`: `eventId, companyId, type, actorId, payloadJson, occurredAt`.

## Endpointy JSON

- `POST /companies`, `PATCH /companies/{id}` — właściciel systemu.
- `GET /companies`, `GET /companies/{id}` — panel właściciela.
- `POST /companies/{id}/license` — limity, trial, płatna licencja, blokada.
- `POST /drivers`, `PATCH /drivers/{id}`, `POST /drivers/{id}/activation`. Link aktywacyjny jest jednorazowy i wygasa po 48 godzinach.
- `POST /activations/driver` i `POST /activations/admin` — sprawdzają limity i atomowo zapisują urządzenie; odpowiedź zawiera decyzję serwera.
- `DELETE /devices/{deviceId}` — zwolnienie urządzenia.

Każda odpowiedź ma format `{ok:true,data:{company,license,devices}}` albo `{ok:false,error:{code,message}}`. Tokeny aktywacyjne i sesyjne są przechowywane wyłącznie jako skróty. Panel właściciela wymaga uwierzytelnienia i kontroli roli po stronie Apps Script. Fingerprint należy hashować i traktować jedynie jako sygnał ryzyka, nie dowód tożsamości.
