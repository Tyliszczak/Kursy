# Kursy

PWA do obsługi tras i kursów kierowców.

## Architektura

- Dane operacyjne aplikacji są przechowywane w repozytorium:
  - `data/company.json` – identyfikacja firmy,
  - `data/routes.json` – trasy i przystanki,
  - `data/courses.json` – konkretne kursy przypisane do tras.
- Google Apps Script służy wyłącznie do sprawdzania danych wrażliwych, np. licencji, użytkowników i urządzeń.
- Aplikacja nie przechowuje tras i kursów jako głównego źródła danych w `localStorage`.

## Model danych

Trasa opisuje przebieg i listę przystanków. Kurs opisuje konkretną realizację trasy, np. godzinę odjazdu i dni obowiązywania.

## PWA

Aplikacja działa jako PWA. Service worker przechowuje pliki programu offline, natomiast dane z katalogu `data/` próbuje zawsze pobrać na świeżo i używa cache tylko awaryjnie.

## Wersja

Jedynym źródłem numeru wersji jest `js/app-version.js`. Korzysta z niego interfejs oraz Service Worker.

## Testy regresyjne

Po zmianach w edytorze uruchom `npm test`. Testy sprawdzają normalizację tras i przystanków oraz kontrakt aktywnych skryptów edytora.

## Stabilizacja edytora

`app-v2.js` jest jedynym właścicielem stanu i zapisu tras. Skrypty pomocnicze pozostawiono wyłącznie dla interakcji, których nie realizuje rdzeń: widoku kart, pełnoekranowych kontrolek, mapy, lokalizacji offline i kół czasu. Nieobsługiwane, historyczne nakładki usunięto.
