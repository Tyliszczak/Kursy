// Moduł zachowany wyłącznie dla zgodności importów starszych kopii PWA.
// Dane licencji nie są już przechowywane lokalnie. Źródłem prawdy jest centralne API.
export function loadStore(){throw new Error('Lokalny magazyn licencji został wyłączony. Użyj centralnego API.')}
export function saveStore(){throw new Error('Lokalny zapis licencji został wyłączony.')}
export function seed(){return {companies:[]}}
