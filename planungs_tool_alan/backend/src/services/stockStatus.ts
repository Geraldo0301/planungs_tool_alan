export function calculateStockStatus(
    aktuellerBestand: number, sicherheitsBestand: number, meldeBestandc: number
): 'ROT' | 'GELB' | 'GRUEN' {
    if(aktuellerBestand < sicherheitsBestand) return 'ROT';
    if(aktuellerBestand < meldeBestandc) return 'GELB';
    return 'GRUEN';
}