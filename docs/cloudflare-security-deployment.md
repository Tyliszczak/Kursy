# Bezpieczna brama Cloudflare dla KursĂłw

## Cel

Cloudflare Pages publikuje statycznÄ… aplikacjÄ™, a funkcja `/api` poĹ›redniczy miÄ™dzy przeglÄ…darkÄ… i Google Apps Script. PrzeglÄ…darka otrzymuje sesje wyĹ‚Ä…cznie w ciasteczkach `Secure`, `HttpOnly` i `SameSite=Strict`. Tokeny nie sÄ… dostÄ™pne dla JavaScriptu.

GitHub Pages pozostaje zgodnym wdroĹĽeniem przejĹ›ciowym. Frontend automatycznie uĹĽywa `/api` tylko na `*.pages.dev`, `tyli.pl` i subdomenach `tyli.pl`.

## Zmienne Cloudflare

W ustawieniach projektu Pages naleĹĽy dodaÄ‡ zaszyfrowane zmienne:

- `UPSTREAM_API_URL` â€” adres `/exec` nowego wdroĹĽenia Apps Script;
- `APP_ORIGIN` â€” dokĹ‚adny adres aplikacji, np. `https://app.tyli.pl`;
- `GATEWAY_SHARED_SECRET` â€” losowy sekret o dĹ‚ugoĹ›ci co najmniej 32 bajtĂłw.

Sekretu nie wolno wpisywaÄ‡ do GitHuba, plikĂłw HTML ani `_headers`.

## Konfiguracja Apps Script

Ten sam `GATEWAY_SHARED_SECRET` naleĹĽy dodaÄ‡ we wĹ‚aĹ›ciwoĹ›ciach skryptu Apps Script. DopĂłki wĹ‚aĹ›ciwoĹ›Ä‡ nie jest ustawiona, backend pozwala na zgodnoĹ›Ä‡ przejĹ›ciowÄ… z GitHub Pages. Po jej ustawieniu bezpoĹ›rednie wywoĹ‚ania Apps Script bez bramy sÄ… odrzucane.

KolejnoĹ›Ä‡ bezpiecznego przeĹ‚Ä…czenia:

1. wdroĹĽyÄ‡ nowÄ… wersjÄ™ Apps Script bez ustawiania `GATEWAY_SHARED_SECRET`;
2. utworzyÄ‡ Cloudflare Pages z integracjÄ… GitHub;
3. dodaÄ‡ zmienne Cloudflare i wykonaÄ‡ test logowania, aktywacji oraz zapisu tras;
4. podĹ‚Ä…czyÄ‡ domenÄ™ `app.tyli.pl`;
5. ustawiÄ‡ `GATEWAY_SHARED_SECRET` w Apps Script;
6. ponownie wykonaÄ‡ testy;
7. dopiero wtedy wyĹ‚Ä…czyÄ‡ stare wdroĹĽenie.

## Ochrona zapewniana przez bramÄ™

- tokeny firmy, wĹ‚aĹ›ciciela i kierowcy trafiajÄ… do ciasteczek `HttpOnly`;
- odpowiedzi dla przeglÄ…darki nie zawierajÄ… jawnych tokenĂłw;
- refresh token kierowcy jest rotowany przez backend i pozostaje niewidoczny dla JavaScriptu;
- brama przyjmuje ĹĽÄ…dania tylko z ustawionego `APP_ORIGIN`;
- odpowiedzi API majÄ… `Cache-Control: no-store`;
- nagĹ‚Ăłwki z `_headers` wĹ‚Ä…czajÄ… CSP, ochronÄ™ przed ramkami i wyciekiem referrera;
- Apps Script moĹĽe odrzucaÄ‡ kaĹĽde ĹĽÄ…danie omijajÄ…ce Cloudflare.

## Wycofanie zmiany

Nie usuwaÄ‡ starego wdroĹĽenia przed peĹ‚nym testem. W razie problemu wystarczy usunÄ…Ä‡ `GATEWAY_SHARED_SECRET` z wĹ‚aĹ›ciwoĹ›ci Apps Script i pozostawiÄ‡ GitHub Pages na dotychczasowym adresie API.


