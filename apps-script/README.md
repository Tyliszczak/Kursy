# Backend rejestracji, licencji i tras Kursy

Backend jest jedynym źródłem prawdy dla tożsamości firmy, potwierdzeń, sesji, licencji, płatności i opublikowanych tras. Frontend nie może sam aktywować licencji ani uznać lokalnego szkicu za opublikowany.

## Uruchomienie

1. Utwórz pusty Arkusz Google i skopiuj jego identyfikator.
2. Utwórz projekt Apps Script, wklej `Code.gs` oraz manifest i uruchom ręcznie funkcję `setup`. Powstaną również arkusze `Routes` i `LicenseHistory`.
3. W **Project Settings → Script properties** ustaw:
   - `SPREADSHEET_ID`
   - `OTP_PEPPER` — długi losowy sekret
   - `SMSAPI_TOKEN` — token SMSAPI (produkcja)
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_START`
   - `STRIPE_PRICE_COMPANY`
   - `CHECKOUT_SUCCESS_URL`
   - `CHECKOUT_CANCEL_URL`
4. Wdróż jako Web app: wykonuje użytkownik wdrażający, dostęp dla każdego.
5. Wstaw adres wdrożenia do meta `kursy-api-url` zarówno w `index.html`, jak i `company.html`.

Do testów bez płatnego SMS można ustawić `ALLOW_TEST_CODES=true`. Tej opcji nie należy używać w produkcji.

## Trasy

- `loadRoutes` zwraca ostatnią wersję tras firmy.
- `saveRoutes` wymaga tokenu sesji oraz `expectedVersion`.
- Zapis jest wykonywany pod blokadą Apps Script. Nieaktualna wersja zwraca `VERSION_CONFLICT`, więc urządzenie nie nadpisze pracy wykonanej gdzie indziej.
- Lokalny IndexedDB zawiera wyłącznie kopie odzyskiwania. Publikacja następuje tylko po ręcznym użyciu przycisku „Zapisz zmiany”.
- Firma z wygasłą albo zablokowaną licencją może odczytać dane, lecz nie może opublikować zmian.

Płatność jest potwierdzana serwer-serwer przez pobranie sesji Stripe po powrocie klienta. Dla pełnej obsługi płatności asynchronicznych zalecany jest dodatkowy bezpieczny webhook, ponieważ Apps Script Web App nie udostępnia niezawodnie nagłówka `Stripe-Signature`.

Rejestracja i oba potwierdzenia pozostawiają licencję w `trial_pending`. Daty triala ustawia wyłącznie aktywacja pierwszego urządzenia kierowcy.
