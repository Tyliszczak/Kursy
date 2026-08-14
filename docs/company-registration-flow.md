# Rejestracja firmy, trial i pĹ‚atnoĹ›Ä‡

1. Firma podaje nazwÄ™, kraj, NIP/VAT ID, administratora, e-mail, telefon i hasĹ‚o.
2. Backend odrzuca drugi wpis o tym samym `country + taxId`; zmiana e-maila lub telefonu nie tworzy nowej firmy ani triala.
3. Administrator potwierdza e-mail kodem waĹĽnym 10 minut, a nastÄ™pnie telefon kodem SMS.
4. Firma otrzymuje dostÄ™p do konfiguracji ze statusem `trial_pending`. Dodawanie tras i kierowcĂłw nie uruchamia triala.
5. Pierwsza poprawna aktywacja urzÄ…dzenia kierowcy atomowo ustawia `trialStartedAt` i `trialEndsAt` dla istniejÄ…cego `companyId`.
6. Zakup pakietu tworzy sesjÄ™ Stripe po stronie backendu. Po opĹ‚aceniu backend weryfikuje sesjÄ™ bezpoĹ›rednio w Stripe i dopiero wtedy ustawia pĹ‚atnÄ… licencjÄ™ `active`.

NIP/VAT ID jest identyfikatorem pomocniczym firmy, a nie sekretem ani samodzielnym dowodem uprawnienia. DostÄ™p nadal wymaga hasĹ‚a, potwierdzeĹ„ i waĹĽnej sesji serwerowej.

