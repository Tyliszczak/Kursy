# Model dystrybucji licencji

Firma jest właścicielem jedynego triala. Ma niezmienny `companyId`; e-mail administratora i numery telefonów kierowców są danymi kontaktowymi, a nie kluczami triala.

## Role i widoki

- Panel właściciela systemu (`owner.html`) tworzy firmy i zarządza licencjami. Nie jest elementem menu firmy.
- Panel firmy (`index.html`) zarządza trasami, kierowcami i urządzeniami wyłącznie swojej firmy.
- Aplikacja kierowcy (`driver.html?token=…`) jednorazowo aktywuje urządzenie kierowcy, usuwa token z adresu i później korzysta z odnawialnej sesji urządzenia. Telefon jest głównym identyfikatorem, a e-mail pozostaje opcjonalny.

## Przepływy

1. Właściciel tworzy firmę: `trial_pending`, domyślnie 3 urządzenia administratorów oraz osobne limity kierowców i ich urządzeń.
2. Administrator może konfigurować firmę, trasy i kierowców; żadna z tych czynności nie startuje triala.
3. Kierowca otwiera własny link. Backend waliduje token, status firmy i limit urządzeń, po czym zapisuje urządzenie atomowo. Pierwsza udana aktywacja ustawia `trialStartedAt` i `trialEndsAt`. Link jest następnie unieważniany, a aplikacja otrzymuje rotowaną sesję przypisaną do urządzenia.
4. Kolejne aktywacje nie zmieniają dat triala. Zmiana telefonu/e-maila ani ponowna rejestracja nie tworzy triala, bo wiążą się z istniejącą firmą.
5. Po wygaśnięciu lub blokadzie dane są zachowane, ale serwer zwraca odmowę działania panelu kierowcy i edycji tras. Właściciel może wydłużyć trial, nadać licencję płatną albo odblokować firmę.

## Zmienione pliki

`js/license-model.js` zawiera reguły domenowe; `js/device-identity.js` tworzy lokalny identyfikator i pomocniczy fingerprint; `js/license-store.js` jest wymienialnym adapterem lokalnym. Interfejsy są rozdzielone na `owner-license-ui.js`, `company-license-ui.js` i `driver-app.js`. `docs/apps-script-license-api.md` opisuje przyszły kontrakt centralnego backendu.
