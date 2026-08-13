# Centralny backend licencji (Apps Script)

Apps Script jest źródłem prawdy: klient wysyła żądania, ale nie ustala sam statusu licencji ani limitów. Lokalne dane w tej wersji są adapterem demonstracyjnym.

## Arkusze

`Companies`: `companyId, name, adminEmail, licenseStatus, trialDays, trialStartedAt, trialEndsAt, paidEndsAt, blocked, adminDeviceLimit, driverLimit, driverDeviceLimit, updatedAt`.

`Drivers`: `driverId, companyId, name, phone, email, status, activationTokenHash, activatedAt, updatedAt`.

`Devices`: `deviceId, companyId, userId, role, fingerprintHash, activatedAt, lastSeenAt, releasedAt`.

`LicenseHistory`: `eventId, companyId, type, actorId, payloadJson, occurredAt`.

## Endpointy JSON

- `POST /companies`, `PATCH /companies/{id}` — właściciel systemu.
- `GET /companies`, `GET /companies/{id}` — panel właściciela.
- `POST /companies/{id}/license` — limity, trial, płatna licencja, blokada.
- `POST /drivers`, `PATCH /drivers/{id}`, `POST /drivers/{id}/activation`.
- `POST /activations/driver` i `POST /activations/admin` — sprawdzają limity i atomowo zapisują urządzenie; odpowiedź zawiera decyzję serwera.
- `DELETE /devices/{deviceId}` — zwolnienie urządzenia.

Każda odpowiedź ma format `{ok:true,data:{company,license,devices}}` albo `{ok:false,error:{code,message}}`. Token aktywacyjny przechowywać wyłącznie jako hash; panel właściciela wymaga po stronie Apps Script silnego uwierzytelnienia i kontroli roli. Fingerprint należy hashować i traktować jedynie jako sygnał ryzyka, nie dowód tożsamości.
