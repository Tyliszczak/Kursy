# Centralny backend Kursy — Google Apps Script

Backend jest jedynym źródłem prawdy dla firm, administratorów, licencji, triali, cen, kierowców, urządzeń, sesji, płatności i opublikowanych tras. Frontend nie może sam przyznać licencji, uruchomić nowego triala ani uznać lokalnego szkicu za opublikowany.

## Uruchomienie i aktualizacja

1. Utwórz Arkusz Google i skopiuj jego identyfikator.
2. Utwórz projekt Apps Script, wklej `Code.gs` oraz manifest.
3. W **Project Settings → Script properties** ustaw:
   - `SPREADSHEET_ID`
   - `OTP_PEPPER` — długi losowy sekret kodów e-mail
   - `PASSWORD_PEPPER` — osobny długi losowy sekret haseł
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_START`
   - `STRIPE_PRICE_COMPANY`
   - `CHECKOUT_SUCCESS_URL`
   - `CHECKOUT_CANCEL_URL`
4. Uruchom ręcznie `setup()`. Funkcja tworzy brakujące arkusze i bezpiecznie dopisuje nowe kolumny do istniejących danych.
5. Jednorazowo uruchom w edytorze funkcję:
   `setOwnerCredentials('twoj@email.pl','długie-losowe-hasło')`
   Hasło nie trafia do frontendu ani arkusza; backend zapisuje sól i skrót w Script Properties.
6. Wdróż jako Web app: wykonuje użytkownik wdrażający, dostęp dla każdego.
7. Ten sam adres wdrożenia wpisz do meta `kursy-api-url` w:
   - `index.html`
   - `company.html`
   - `owner.html`
   - `driver.html`
   - `driver-app/index.html`

Przy kolejnych zmianach backendu aktualizuj istniejące wdrożenie Apps Script. Nie jest potrzebne wdrożenie Netlify.

## Model danych

Arkusze: `Companies`, `Admins`, `Licenses`, `Drivers`, `Devices`, `DriverSessions`, `Vehicles`, `Routes`, `Sessions`, `OwnerSessions`, `Verifications`, `Payments`, `LicenseHistory`.

- firma rozpoczyna w `trial_pending`;
- dodanie firmy, tras lub kierowcy nie uruchamia triala;
- trial uruchamia tylko `activateDriverDevice` pierwszego kierowcy;
- urządzenia zwolnione pozostają w historii;
- limit administratorów jest sprawdzany serwerowo, domyślnie wynosi 3;
- panel właściciela może zmienić limity, cenę, walutę, trial, płatną licencję i blokadę;
- `saveRoutes` wymaga zgodnego `expectedVersion`, co blokuje nadpisanie zmian z innego urządzenia.

## Lokalna pamięć

IndexedDB zawiera wyłącznie kopie odzyskiwania tras. Publikacja następuje tylko po ręcznym „Zapisz zmiany”. Aplikacja kierowcy może zachować ostatnio pobrane trasy jako kopię offline, ale nie używa tras demonstracyjnych, gdy backend jest niedostępny.

## Bezpieczeństwo i płatności

Sekrety Stripe, haseł, kodów e-mail oraz właściciela znajdują się wyłącznie w Script Properties. Sesje w arkuszu są przechowywane jako skróty. Cena indywidualna firmy jest przekazywana do Stripe przez serwerowe `price_data`.

Dla niezawodnego odnawiania subskrypcji wymagany jest podpisany webhook Stripe w usłudze serwerowej obsługującej nagłówek `Stripe-Signature`. Jednorazowe potwierdzenie Checkout nie odnawia ponownie wcześniej rozliczonej sesji. Rejestracja firmy nie wysyła SMS-ów; numer telefonu pozostaje daną kontaktową.
