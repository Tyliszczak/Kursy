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

Aktualna wersja testowa: `0.2.0`.
