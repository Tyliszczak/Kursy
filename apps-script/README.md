# Backend rejestracji i pĹ‚atnoĹ›ci Kursy

Backend jest jedynym ĹşrĂłdĹ‚em prawdy dla toĹĽsamoĹ›ci firmy, potwierdzeĹ„, sesji, licencji i pĹ‚atnoĹ›ci. Frontend nie moĹĽe sam aktywowaÄ‡ licencji.

## Uruchomienie

1. UtwĂłrz pusty Arkusz Google i skopiuj jego identyfikator.
2. UtwĂłrz projekt Apps Script, wklej `Code.gs` oraz manifest i uruchom rÄ™cznie funkcjÄ™ `setup`.
3. W **Project Settings â†’ Script properties** ustaw:
   - `SPREADSHEET_ID`
   - `OTP_PEPPER` â€” dĹ‚ugi losowy sekret
   - `SMSAPI_TOKEN` â€” token SMSAPI (produkcja)
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_START`
   - `STRIPE_PRICE_COMPANY`
   - `CHECKOUT_SUCCESS_URL`
   - `CHECKOUT_CANCEL_URL`
4. WdrĂłĹĽ jako Web app: wykonuje uĹĽytkownik wdraĹĽajÄ…cy, dostÄ™p dla kaĹĽdego.
5. Wstaw adres wdroĹĽenia do meta `kursy-api-url` w `index.html`.

Do testĂłw bez pĹ‚atnego SMS moĹĽna ustawiÄ‡ `ALLOW_TEST_CODES=true`. Tej opcji nie naleĹĽy uĹĽywaÄ‡ w produkcji.

PĹ‚atnoĹ›Ä‡ jest potwierdzana serwer-serwer przez pobranie sesji Stripe po powrocie klienta. DziÄ™ki temu frontend nie moĹĽe sam oznaczyÄ‡ pĹ‚atnoĹ›ci jako wykonanej. Dla peĹ‚nej obsĹ‚ugi pĹ‚atnoĹ›ci asynchronicznych zalecany jest dodatkowy bezpieczny webhook (np. Cloudflare/Netlify Function), poniewaĹĽ Apps Script Web App nie udostÄ™pnia niezawodnie nagĹ‚Ăłwka `Stripe-Signature`.

Rejestracja i oba potwierdzenia pozostawiajÄ… licencjÄ™ w `trial_pending`. Daty triala ustawia wyĹ‚Ä…cznie endpoint aktywacji pierwszego urzÄ…dzenia kierowcy z moduĹ‚u licencyjnego.

