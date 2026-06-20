# 🛡️ Zephyrus — City Trap

**Ağıllı Şəhər Sistemləri üçün Sİ əsaslı Kibertəhlükə Aşkarlama Prototipi**

> AIRO2026 Hackathon · Tapşırıq 1 · Komanda: **Zephyrus**

---

## Layihənin adı
**City Trap** — Ağıllı Şəhər üçün Aldatma Şəbəkəsi (Deception Grid) ilə gücləndirilmiş Sİ əsaslı təhlükə aşkarlama mühərriki.

## Komanda adı
**Zephyrus**

## Seçilmiş çağırış
**Tapşırıq 1 — Ağıllı şəhər sistemləri üçün Sİ əsaslı kibertəhlükə aşkarlanması.**
Sistem fəaliyyət loglarını analiz edir, anomal davranışı aşkarlayır, mümkün təhlükələri təsnif edir, administratoru xəbərdar edir (simulyasiya), təhlükə səviyyəsini göstərir (aşağı / orta / yüksək) və qısa insident hesabatı yaradır.

## Problem
Ağıllı şəhər qurğuları (svetoforlar, trafik sensorları, bankomatlar, yol kameraları, su sayğacları, SCADA/PLC, şəhər portalları) çox vaxt köhnə protokollar, default parollar və zəif izolyasiya ilə işləyir. Onları izləyən insan analitiklər isə minlərlə log sətrini əl ilə oxuya bilmir. Nəticədə hücumlar gec aşkarlanır.

## Həll
Real qurğuların yanına realistik **tələlər (decoy)** yerləşdiririk: saxta svetofor kontrolleri, saxta şəhər portalı, canary token faylı, saxta kamera və saxta bankomat. **Heç bir qanuni istifadəçi tələyə toxunmur** → tələyə dəyən hər müraciət sıfır yanlış-pozitivli, ən yüksək etibarlı təhlükə siqnalıdır. Eyni zamanda mühərrik şəhərin hadisə axınını (normal + şübhəli) da analiz edir və hamısının üzərində **anomaliya aşkarlama + təsnifat + risk qiymətləndirmə + MITRE ATT&CK etiketləmə** aparır.

## Əsas funksiyalar
- 🎯 **5 Tələ (Decoy):** saxta svetofor, saxta portal, canary token, saxta kamera və saxta bankomat (ATM "jackpotting" tələsi).
- 🧠 **3 qatlı Sİ:** (1) IsolationForest anomaliya aşkarlama (ML), (2) hibrid ML+qayda təsnifat və risk, (3) opsional LLM hesabat.
- 🗺️ **İnteraktiv ŞƏHƏR xəritəsi (SVG):** yol şəbəkəsi (küçələr + kəsişmələr), ~14 bina bloku/məhəllə və 2 park üzərində **~14 IoT cihazı realistik yerlərdə** — svetofor və trafik sensoru kəsişmələrdə, bankomatlar bank yanında, kameralar yollarda, hava/park sensorları parklarda. Cihazlar canlı vəziyyətə görə yaşıl/sarı/qırmızı (nəbzli) yanır; üzərinə gələndə şüşəvari (glassmorphism) tooltip; tam ekran rejimi.
- 🎬 **Simulyasiya İdarə Mərkəzi:** "🔴 Hücumu Başlat" hücumçunun səyahətini mərhələ-mərhələ (Kəşfiyyat → İstismar → Brute Force → Sızma) real-vaxt danışır. Hücum **~15 saniyəyə** yayılır, **qeyri-bərabər (irregular) zaman aralıqları** ilə axır və **cihaz kateqoriyasına görə fərqli hücum növləri** istifadə edir (ICS/Modbus skanı, RTSP hijack, ATM jackpotting + zərərli firmware, brute-force, canary sızması). Bütün cihazlar eyni anda yox — bəzi tsiklər yalnız bir-iki cihaza təsir edir.
- 📊 **Canlı Siqnallar (səhifələnmiş hadisə jurnalı):** ən yeni yuxarıda; **səhifə başına 5 / 10 / 15** seçimi və **Əvvəlki / Sonrakı** naviqasiyası; risk göstəriciləri **statik** (peşəkar rəng kodu).
- 📂 **Log Analiz Mərkəzi + Çevirici:** real korporativ logları yükləyin — **Syslog (RFC 5424)**, **Windows Event (EVTX/JSON)**, **CEF/LEEF** — çevirici onları avtomatik platformanın formatına xəritələyir və ML mühərrikinə verir.
- 📝 **İnsident Hesabatı:** Azərbaycanca xülasə + niyə yüksək riskli olduğunun izahı + tövsiyə olunan addımlar; üstündə **ədədi statistika (KPI) paneli** (hadisə, siqnal, yüksək risk, tələ vurğusu, hədəf cihaz, orta ML balı).
- 📈 **Hər hadisə üçün** risk səviyyəsi, MITRE ATT&CK etiketi və 0–100 anomaliya balı.

### İki iş rejimi (canlı simulyasiya vs forenzik analiz)
- **🔴 Hücumu Başlat** — interaktiv təlim / canlı demo. Dramatik hekayə frontend-də idarə olunur, **lakin hər hadisə yenə backend ML mühərrikindən real bal alır (hibrid)**.
- **📂 Log Analiz Mərkəzi** — post-insident audit / forenzika. Real yüklənmiş fayllar çevrilib ML mühərrikinə verilir.

## Texnologiya steki
- **Backend:** Python 3 · FastAPI · uvicorn (vəziyyət yaddaşda saxlanılır, verilənlər bazası yoxdur).
- **Maşın öyrənməsi:** scikit-learn **IsolationForest** (kiçik, lokal, izah edilə bilən) · numpy.
- **CSV log oxuma:** Python-un daxili `csv` modulu (əlavə kitabxana lazım deyil).
- **Frontend:** React (Vite, sadə JavaScript) · tünd "SOC konsolu" dizaynı · interaktiv SVG şəhər xəritəsi.
- **Canlı yenilənmə:** frontend hər 1 saniyədə `GET /api/state` sorğusu göndərir.
- **LLM (opsional):** Claude (`claude-sonnet-4-6`) — yalnız `ANTHROPIC_API_KEY` varsa; əks halda offline şablon hesabat işləyir.

### İstifadə olunan açıq mənbə kitabxanalar (açıqlama)
FastAPI, uvicorn, scikit-learn, numpy, python-multipart, React, Vite və (opsional) Anthropic Claude API. Yalnız sənəd üçün: **matplotlib** — memarlıq diaqramını (`docs/architecture-diagram.png`) yaradan skriptdə işlədilir, sistemin işləməsi üçün lazım deyil. Tam siyahı: [`requirements.txt`](requirements.txt) və [`src/frontend/package.json`](src/frontend/package.json).

### Sənədlər
- Memarlıq diaqramı: [`docs/architecture-diagram.png`](docs/architecture-diagram.png) (skriptlə yaradılır: [`docs/gen_architecture_diagram.py`](docs/gen_architecture_diagram.py))
- Problemin təsviri: [`docs/problem-description.md`](docs/problem-description.md)
- Etik bəyannamə: [`docs/ethical-declaration.md`](docs/ethical-declaration.md)
- Pitch deck planı: [`presentation/pitch-deck-outline.md`](presentation/pitch-deck-outline.md)

## Necə işə salınır
**Tələblər:** Windows · Python 3 · Node.js (artıq quraşdırılıb).

**Ən sadə yol** — layihə qovluğunda:
```
run.bat
```
Bu, iki pəncərə açır (Backend 8010, Frontend 5173). Sonra brauzerdə açın: **http://localhost:5173**

**Əl ilə (iki ayrı terminal):**
```
REM 1-ci terminal (backend)
.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8010 --app-dir src\backend

REM 2-ci terminal (frontend)
cd src\frontend
npm run dev
```

### Hücum simulyasiyasını işə salmaq
İki yol var (hər ikisi yalnız öz lokal serverimizə təsir edir):
- **Dashboard düyməsi (tövsiyə):** "🔴 Hücumu Başlat" → `POST /api/simulate-attack` çağırır; kəşfiyyat → tələlər → brute-force → canary zənciri ~15 saniyə ərzində canlı axına qeyri-bərabər düşür.
- **Müstəqil skript:** server işləyərkən `python src/backend/attacker.py` — real HTTP sorğuları ilə tələləri vurur. Bu, "hücumçu"-nun bizim öz skriptimiz olduğunu və heç bir real sistemə toxunmadığını göstərir.

## Demo giriş məlumatları
**Yoxdur.** Paneli görmək üçün giriş (login) tələb olunmur — dashboard birbaşa açılır. (Saxta portal tələsi isə qəsdən hər parolu "uğursuz" qeyd edir ki, brute-force cəhdlərini tutsun — bu, real giriş deyil, tələdir.)

## Nümunə data
[`data/sample-data.csv`](data/sample-data.csv) — ağıllı şəhər giriş loglarının nümunəsi (sütunlar: `timestamp, source_ip, device, action, status`). Normal trafik + 3 şübhəli nümunə qarışdırılıb:
- **Kəşfiyyat skanı** — bir kənar IP gecə qısa müddətdə çoxlu fərqli cihaza müraciət edir.
- **Brute-force** — portala qısa müddətdə təkrar uğursuz giriş cəhdləri.
- **Gecə icazəsiz girişi** — gecə saatında həssas SCADA cihazına giriş.

Data [`src/backend/gen_sample_data.py`](src/backend/gen_sample_data.py) ilə təkrarlana bilən şəkildə yaradılır. Mühərrik bu faylı da analiz edir: `POST /api/analyze-logs` (hər log sətri eyni Sİ mühərrikindən keçir; yalnız şübhəli olanlar siqnal kimi panelə çıxır).

**Real log yükləmə:** "📂 Log Analiz Mərkəzi" düyməsi ilə öz Syslog/Windows/CEF fayllarınızı yükləyin, **🔄 Çevir** ilə platformanın formatına çevirin, sonra **🧠 ML Mühərrikinə Göndər**. Hazır daxili nümunəni dərhal sınamaq üçün **Daxili nümunə CSV** düyməsi (modalı bağlayıb analizi başladır). Çevirici sahələri xəritələyir → `POST /api/analyze-upload` ML mühərrikinə göndərir. Çevirici kodu: [`src/frontend/src/logConverter.js`](src/frontend/src/logConverter.js).

### API endpoint-ləri (xülasə)
- `GET /api/state` — bütün cari vəziyyət (frontend hər 1s soruşur)
- `POST /api/simulate-attack` — canlı hücum simulyasiyası (kəşfiyyat → tələ → brute-force → canary)
- `POST /api/analyze-logs` — daxili nümunə CSV-ni analiz et
- `POST /api/analyze-upload` — yüklənmiş (çevrilmiş) logları analiz et
- `POST /api/reset` — vəziyyəti təmizlə
- `GET /decoy/...` — tələ endpoint-ləri

## Məhdudiyyətlər
- Bu, **MVP (minimum işlək məhsul)** prototipidir, real istehsalat sistemi deyil.
- Vəziyyət yaddaşda saxlanılır — server söndükdə data sıfırlanır (verilənlər bazası yoxdur).
- Hər şey lokal mühitdə işləyir; real qurğulara qoşulmur (şəhər xəritəsi və hücum simulyasiyadır).
- ML modeli yanlış-pozitiv verə bilər, LLM "uydurma" (hallucination) edə bilər → buna görə **insan təsdiqi** saxlanılır.

## Gələcək inkişaf imkanları
- Real qurğu log-agent inteqrasiyası (passiv log oxuma).
- Daha çox tələ şablonu (PLC, IoT gateway, ağıllı sayğac).
- Mərkəzi konsol + çox-saytlı (multi-tenant) idarəetmə.
- WebSocket ilə real-vaxt push (poll əvəzinə).
- Çeviriciyə daha çox format (Zeek, Suricata EVE, AWS CloudTrail) və server tərəfi parsing.
- Model fərdiləşdirmə: hər saytın "normal"-ını öz tarixi loglarından öyrənmək.

## Etik və hüquqi qeydlər
Hər şey bizim öz təcrid olunmuş lokal mühitimizdə işləyir. Heç bir real sistemə, şəbəkəyə və ya üçüncü tərəfə hücum etmirik. "Hücumçu" bizim öz simulyasiya skriptimizdir. Tələlərdə yalnız **saxta data** var — real vətəndaş məlumatı yoxdur. Həll **tamamilə müdafiə xarakterlidir**. Detallar: [`docs/ethical-declaration.md`](docs/ethical-declaration.md).

---

### Sİ harada işləyir? (qısa)
**ML — Sİ-nin bir alt çoxluğudur, alternativi deyil.** Biz Sİ-ni 3 qatda işlədirik:
1. **Aşkarlama (ML):** IsolationForest normal trafiki öyrənir, anomaliyanı tapır.
2. **Təsnifat/qərar (ML + qayda):** təhlükə sinfi + risk səviyyəsi (tələ vurğusu → həmişə yüksək).
3. **Cavab/izah (LLM, opsional):** Azərbaycanca hesabat və izah.

**İnsan-dövrədə (human-in-the-loop):** *"Sİ hazırlayır, insan təsdiqləyir."* Sistem analitikin işini ~10 dəfə azaldır, sıfıra endirmir.
