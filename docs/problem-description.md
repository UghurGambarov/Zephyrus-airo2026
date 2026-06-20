# Problemin təsviri — Ağıllı Şəhər Kibertəhlükəsizliyi

> Zephyrus komandası · City Trap layihəsi · AIRO2026 · Tapşırıq 1

## Kontekst
Ağıllı şəhərlər minlərlə qoşulu qurğudan ibarətdir: svetofor kontrollerləri,
nəzarət kameraları, ağıllı sayğaclar, SCADA/PLC sistemləri və şəhər portalları.
Bu qurğular çox vaxt:
- köhnə, şifrələnməmiş protokollardan istifadə edir (məs. Modbus),
- default parollarla işləyir,
- nadir hallarda yenilənir (firmware),
- zəif şəbəkə izolyasiyasına malikdir.

## Problem
Bu qurğulara edilən hücumlar gec aşkarlanır, çünki:
1. Hücumçu əvvəlcə **kəşfiyyat** (skan, port yoxlama) aparır — bu, normal trafikə bənzəyə bilər.
2. İnsan analitiklər minlərlə log sətrini əl ilə oxuya bilmir.
3. Sadə qaydalar (rule-based) yalnız **məlum** hücumları tutur, yeni davranışı yox.

## Niyə Sİ lazımdır
Maşın öyrənməsi (ML) — Sİ-nin bir **alt çoxluğudur** — normal davranışı öyrənir və
**əvvəl görünməmiş** anomaliyaları tuta bilir. Tələlər (decoy) isə ən yüksək etibarlı
siqnalı verir: qanuni istifadəçi heç vaxt tələyə toxunmadığı üçün tələyə dəyən hər
müraciət demək olar ki, hücumdur (sıfır yanlış-pozitiv).

## Bizim həll — Aldatma Şəbəkəsi + Sİ Aşkarlama Mühərriki
Real qurğuların yanına eyni sinifdən **tələ (decoy)** qoyuruq və şəhərin hadisə
axınını (loglar) mərkəzi mühərriklə analiz edirik. Sİ 3 qatda işləyir:

1. **Aşkarlama qatı (ML)** — `scikit-learn IsolationForest` normal trafiki öyrənir,
   anomaliyanı (iş-kənarı giriş, skan partlayışı, qeyri-adi tezlik) tapır.
2. **Təsnifat və qərar qatı (hibrid ML + qaydalar)** — hadisəni təsnif edir
   (Kəşfiyyat / Brute Force / İcazəsiz Giriş / Data Sızma), risk səviyyəsi verir
   (aşağı / orta / yüksək) və MITRE ATT&CK etiketi əlavə edir.
3. **Cavab və izah qatı (LLM, opsional)** — Azərbaycanca insident hesabatı və
   "niyə yüksək risk?" izahı yaradır. İnternet olmasa, deterministik şablon işləyir.

## Real dünyada tətbiq və miqyaslana bilmə
Prototip real tətbiq modelinin kiçik simulyasiyasıdır:
- **Real cihaza toxunmuruq.** Yanına (a) yüngül tələ, (b) passiv log/agent axını qoyuruq.
- **Sinif əsaslı şablonlar.** Şəhərdə minlərlə fərqli konfiqurasiya yox, bir neçə cihaz
  MODELİ var. Hər sinif üçün bir tələ şablonu qururuq və təkrarlayırıq.
- **Mərkəzi konsol + yüngül edge.** Bir panel çoxlu saytı idarə edir; tələlər/agentlər
  yüngüldür (konteynerləşdirilə bilər). Bu, real Paylanmış Aldatma Platformalarının (DDP)
  miqyaslanma modelidir; çox-saytlılığı (kiçik Ağalı kəndi və böyük Bakı seqmenti) dəstəkləyir.
- **Niyə ümumiləşir.** Biz bir cihaz növünü deyil, hücumçunun **kəşfiyyat davranışını**
  aşkarlayırıq — bu davranış svetofor, kamera, sayğac, SCADA və portalda eynidir.
  Yeni cihaz növü əlavə etmək = yeni tələ şablonu əlavə etmək.

Memarlıq diaqramı: [architecture-diagram.png](architecture-diagram.png).
