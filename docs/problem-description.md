# Problemin təsviri — Ağıllı Şəhər Kibertəhlükəsizliyi

> Qeyd: bu sənəd Faza 6-da tam genişləndiriləcək. Aşağıda ilkin xülasə var.

## Kontekst
Ağıllı şəhərlər minlərlə qoşulu qurğudan ibarətdir: svetofor kontrollerləri,
nəzarət kameraları, ağıllı sayğaclar, SCADA/PLC sistemləri və şəhər portalları.
Bu qurğular çox vaxt:
- köhnə, şifrələnməmiş protokollardan istifadə edir,
- default parollarla işləyir,
- nadir hallarda yenilənir (firmware),
- zəif şəbəkə izolyasiyasına malikdir.

## Problem
Bu qurğulara edilən hücumlar gec aşkarlanır, çünki:
1. Hücumçu əvvəlcə **kəşfiyyat** (skan, port yoxlama) aparır — bu, normal trafikə bənzəyə bilər.
2. İnsan analitiklər minlərlə log sətrini əl ilə oxuya bilmir.
3. Sadə qaydalar (rule-based) yalnız **məlum** hücumları tutur, yeni davranışı yox.

## Niyə Sİ lazımdır
Maşın öyrənməsi (ML) normal davranışı öyrənir və **əvvəl görünməmiş** anomaliyaları
tuta bilir. Tələlər (decoy) isə ən yüksək etibarlı siqnalı verir: qanuni istifadəçi
heç vaxt tələyə toxunmadığı üçün tələyə dəyən hər müraciət demək olar ki, hücumdur.
