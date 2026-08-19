# Trasy 2.0

Statyczna aplikacja PWA do prezentowania rozkładów tras pracowniczych. Dane w `routes.js` pochodzą z `BAZA_TRAS.xlsx`.

## Kopia używana przez system Kursy

Ten katalog powstał jako kompletna kopia repozytorium `Tyliszczak/Trasy-2.0` z gałęzi `main`, commit `9d41b0c7e26546d3d0f0eb8b663499d934fc7f42`. Repozytorium źródłowe pozostaje niezależne i nie jest modyfikowane przez integrację.

Zmiany wykonywane w tym katalogu dotyczą wyłącznie połączenia aplikacji kierowcy z aktywacją urządzenia, trialem firmy i kontrolą licencji w projekcie `Kursy`.

## Uruchomienie lokalne

Otwórz katalog przez dowolny serwer HTTP, a następnie wejdź na `index.html`. Test danych uruchomisz poleceniem `npm test` (nie wymaga dodatkowych pakietów).

## Aktualizacja tras

Na ten moment dane są zapisane lokalnie, aby aplikacja działała również offline. Kolejny etap to podłączenie importu z arkusza lub Google Apps Script po uzyskaniu dostępu do skryptu.
