# Model dystrybucji licencji

Firma jest wĹ‚aĹ›cicielem jedynego triala. Ma niezmienny `companyId`; e-mail administratora i numery telefonĂłw kierowcĂłw sÄ… danymi kontaktowymi, a nie kluczami triala.

## Role i widoki

- Panel wĹ‚aĹ›ciciela systemu (`owner.html`) tworzy firmy i zarzÄ…dza licencjami. Nie jest elementem menu firmy.
- Panel firmy (`index.html`) zarzÄ…dza trasami, kierowcami i urzÄ…dzeniami wyĹ‚Ä…cznie swojej firmy.
- Aplikacja kierowcy (`driver.html#activate=â€¦`) jednorazowo aktywuje urzÄ…dzenie kierowcy, natychmiast usuwa token z adresu i pĂłĹşniej korzysta z odnawialnej sesji urzÄ…dzenia. Fragment adresu nie jest wysyĹ‚any w ĹĽÄ…daniu HTTP. Telefon jest gĹ‚Ăłwnym identyfikatorem, a e-mail pozostaje opcjonalny.

## PrzepĹ‚ywy

1. WĹ‚aĹ›ciciel tworzy firmÄ™: `trial_pending`, domyĹ›lnie 3 urzÄ…dzenia administratorĂłw oraz osobne limity kierowcĂłw i ich urzÄ…dzeĹ„.
2. Administrator moĹĽe konfigurowaÄ‡ firmÄ™, trasy i kierowcĂłw; ĹĽadna z tych czynnoĹ›ci nie startuje triala.
3. Kierowca otwiera wĹ‚asny link. Backend waliduje token, status firmy i limit urzÄ…dzeĹ„, po czym zapisuje urzÄ…dzenie atomowo. Pierwsza udana aktywacja ustawia `trialStartedAt` i `trialEndsAt`. Link jest nastÄ™pnie uniewaĹĽniany, a aplikacja otrzymuje rotowanÄ… sesjÄ™ przypisanÄ… do urzÄ…dzenia.
4. Kolejne aktywacje nie zmieniajÄ… dat triala. Zmiana telefonu/e-maila ani ponowna rejestracja nie tworzy triala, bo wiÄ…ĹĽÄ… siÄ™ z istniejÄ…cÄ… firmÄ….
5. Po wygaĹ›niÄ™ciu lub blokadzie dane sÄ… zachowane, ale serwer zwraca odmowÄ™ dziaĹ‚ania panelu kierowcy i edycji tras. WĹ‚aĹ›ciciel moĹĽe wydĹ‚uĹĽyÄ‡ trial, nadaÄ‡ licencjÄ™ pĹ‚atnÄ… albo odblokowaÄ‡ firmÄ™.

## Zmienione pliki

`js/license-model.js` zawiera reguĹ‚y domenowe; `js/device-identity.js` tworzy lokalny identyfikator i pomocniczy fingerprint; `js/license-store.js` jest wymienialnym adapterem lokalnym. Interfejsy sÄ… rozdzielone na `owner-license-ui.js`, `company-license-ui.js` i `driver-app.js`. `docs/apps-script-license-api.md` opisuje przyszĹ‚y kontrakt centralnego backendu.

