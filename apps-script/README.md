# Backend rejestracji i płatności Kursy

Backend jest jedynym źródłem prawdy dla tożsamości firmy, potwierdzeń, sesji, licencji i płatności. Frontend nie może sam aktywować licencji.

## Uruchomienie

1. Utwórz pusty Arkusz Google i skopiuj jego identyfikator.
2. Utwórz projekt Apps Script, wklej `Code.gs` oraz manifest i uruchom ręcznie funkcję `setup`.
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
5. Wstaw adres wdrożenia do meta `kursy-api-url` w `index.html`.

Do testów bez płatnego SMS można ustawić `ALLOW_TEST_CODES=true`. Tej opcji nie należy używać w produkcji.

Płatność jest potwierdzana serwer-serwer przez pobranie sesji Stripe po powrocie klienta. Dzięki temu frontend nie może sam oznaczyć płatności jako wykonanej. Dla pełnej obsługi płatności asynchronicznych zalecany jest dodatkowy bezpieczny webhook (np. Cloudflare/Netlify Function), ponieważ Apps Script Web App nie udostępnia niezawodnie nagłówka `Stripe-Signature`.

Rejestracja i oba potwierdzenia pozostawiają licencję w `trial_pending`. Daty triala ustawia wyłącznie endpoint aktywacji pierwszego urządzenia kierowcy z modułu licencyjnego.

