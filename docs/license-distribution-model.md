# Model dystrybucji licencji

Firma jest właścicielem jedynego triala. Ma niezmienny `companyId`; e-mail administratora i numery telefonów kierowców są danymi kontaktowymi, a nie kluczami triala.

## Role i widoki

- Panel firmy („Firma i licencja”) dodaje kierowców, pokazuje urządzenia i pozwala je zwalniać.
- Panel właściciela jest osobnym adresem `#owner-licenses`, niewidocznym w menu klienta. Zarządza firmami, limitami, datami, blokadą i historią.
- Kierowca otrzymuje link aktywacyjny, identyfikowany operacyjnie telefonem; e-mail jest opcjonalny.

## Przepływy

1. Właściciel tworzy firmę: `trial_pending`, domyślnie 3 urządzenia administratorów oraz osobne limity kierowców i ich urządzeń.
2. Administrator może konfigurować firmę, trasy i kierowców; żadna z tych czynności nie startuje triala.
3. Kierowca otwiera własny link. Serwer docelowy waliduje token, status firmy i limit urządzeń, po czym zapisuje urządzenie atomowo. Pierwsza udana aktywacja ustawia `trialStartedAt` i `trialEndsAt`.
4. Kolejne aktywacje nie zmieniają dat triala. Zmiana telefonu/e-maila ani ponowna rejestracja nie tworzy triala, bo wiążą się z istniejącą firmą.
5. Po wygaśnięciu lub blokadzie dane są zachowane, ale serwer zwraca odmowę działania panelu kierowcy i edycji tras. Właściciel może wydłużyć trial, nadać licencję płatną albo odblokować firmę.

## Zmienione pliki

`js/license-model.js` zawiera reguły domenowe; `js/device-identity.js` tworzy lokalny identyfikator i pomocniczy fingerprint; `js/license-store.js` jest wymienialnym adapterem lokalnym; `js/license-ui.js` renderuje oba panele. `docs/apps-script-license-api.md` opisuje przyszły kontrakt centralnego backendu.
