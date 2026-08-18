# Centralny backend Kursy — Google Apps Script

Backend jest jedynym źródłem prawdy dla firm, administratorów, licencji, triali, cen, kierowców, urządzeń, sesji, płatności i opublikowanych tras. Frontend nie może sam przyznać licencji, uruchomić nowego triala ani uznać lokalnego szkicu za opublikowany.

## Uruchomienie i aktualizacja

1. Utwórz Arkusz Google i skopiuj jego identyfikator.
2. Utwórz projekt Apps Script i dodaj pliki `Code.gs`, `zz_AccountDeviceExtensions.gs`, `RouteStorageV2.gs` oraz manifest.
3. W **Project Settings → Script properties** ustaw:
   - `SPREADSHEET_ID`
   - `OTP_PEPPER` — długi losowy sekret kodów e-mail
   - `PASSWORD_PEPPER` — osobny długi losowy sekret haseł
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_START`
   - `STRIPE_PRICE_COMPANY`
   - `CHECKOUT_SUCCESS_URL`
   - `CHECKOUT_CANCEL_URL`
4. Uruchom ręcznie `setup()`. Funkcja tworzy podstawowe arkusze i bezpiecznie dopisuje nowe kolumny do istniejących danych.
5. Uruchom `migrateRouteStorageV2()`. Funkcja tworzy `RouteItems` i `RouteState` oraz przenosi dotychczasowe trasy ze starego `Routes`. Stary `Routes` nie jest kasowany i pozostaje kopią migracyjną.
6. Jednorazowo uruchom w edytorze funkcję:
   `setOwnerCredentials('twoj@email.pl','długie-losowe-hasło')`
   Hasło nie trafia do frontendu ani arkusza; backend zapisuje sól i skrót w Script Properties.
7. Wdróż jako Web app: wykonuje użytkownik wdrażający, dostęp dla każdego.
8. Ten sam adres wdrożenia wpisz do konfiguracji wszystkich części aplikacji.

Przy kolejnych zmianach backendu aktualizuj istniejące wdrożenie Apps Script. Nie twórz nowego adresu wdrożenia bez potrzeby.

## Model danych tras v2

Stary arkusz `Routes` miał jeden wiersz na firmę i wszystkie jej trasy w jednym polu `routesJson`. W wersji v2 każda trasa jest osobnym rekordem w `RouteItems`:

`routeId | companyId | name | position | version | routeJson | updatedAt | updatedBy | deletedAt`

`RouteState` przechowuje wersję całego zestawu firmy i stan migracji. `Routes` pozostaje tylko jako bezpieczna kopia starego formatu.

Dzięki temu:

- zmiana jednej trasy zapisuje tylko tę trasę;
- frontend wysyła do `saveRoutes` tylko trasy zmienione oraz identyfikatory tras usuniętych;
- każda trasa ma własny numer wersji, więc zmiana trasy A na innym urządzeniu nie blokuje niezależnej zmiany trasy B;
- przed zapisem backend sprawdza wszystkie konflikty, dzięki czemu konflikt nie może zostawić częściowo zapisanej aktualizacji;
- aplikacja kierowcy czyta trasy z `RouteItems`;
- pojedynczy `routeJson` jest ograniczony do 45 000 znaków, aby zachować bezpieczny zapas względem ograniczenia komórki Arkuszy Google.

## Pozostały model danych

Arkusze: `Companies`, `Admins`, `Licenses`, `Drivers`, `Devices`, `DriverSessions`, `Vehicles`, `Routes`, `RouteItems`, `RouteState`, `Sessions`, `OwnerSessions`, `Verifications`, `Payments`, `LicenseHistory`.

- firma rozpoczyna w `trial_pending`;
- dodanie firmy, tras lub kierowcy nie uruchamia triala;
- trial uruchamia tylko `activateDriverDevice` pierwszego kierowcy;
- urządzenia zwolnione pozostają w historii;
- limit administratorów jest sprawdzany serwerowo;
- panel właściciela może zmienić limity, cenę, walutę, trial, płatną licencję i blokadę.

## Lokalna pamięć

IndexedDB zawiera wyłącznie kopie odzyskiwania tras. Publikacja następuje tylko po ręcznym „Zapisz zmiany”. Aplikacja kierowcy może zachować ostatnio pobrane trasy jako kopię offline.

## Bezpieczeństwo i płatności

Sekrety Stripe, haseł, kodów e-mail oraz właściciela znajdują się wyłącznie w Script Properties. Sesje w arkuszu są przechowywane jako skróty. Cena indywidualna firmy jest przekazywana do Stripe przez serwerowe `price_data`.
