# Rejestracja firmy, trial i płatność

1. Firma podaje nazwę, kraj, NIP/VAT ID, administratora, e-mail, telefon i hasło.
2. Backend odrzuca drugi wpis o tym samym `country + taxId`; zmiana e-maila lub telefonu nie tworzy nowej firmy ani triala.
3. Administrator potwierdza e-mail kodem ważnym 10 minut, a następnie telefon kodem SMS.
4. Firma otrzymuje dostęp do konfiguracji ze statusem `trial_pending`. Dodawanie tras i kierowców nie uruchamia triala.
5. Pierwsza poprawna aktywacja urządzenia kierowcy atomowo ustawia `trialStartedAt` i `trialEndsAt` dla istniejącego `companyId`.
6. Zakup pakietu tworzy sesję Stripe po stronie backendu. Po opłaceniu backend weryfikuje sesję bezpośrednio w Stripe i dopiero wtedy ustawia płatną licencję `active`.

NIP/VAT ID jest identyfikatorem pomocniczym firmy, a nie sekretem ani samodzielnym dowodem uprawnienia. Dostęp nadal wymaga hasła, potwierdzeń i ważnej sesji serwerowej.

