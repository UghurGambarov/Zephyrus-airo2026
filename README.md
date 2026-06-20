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
Ağıllı şəhər qurğuları (svetoforlar, kameralar, sayğaclar, SCADA/PLC, şəhər portalları) çox vaxt köhnə protokollar, default parollar və zəif izolyasiya ilə işləyir. Onları izləyən insan analitiklər isə minlərlə log sətrini əl ilə oxuya bilmir. Nəticədə hücumlar gec aşkarlanır.

## Həll
Real qurğuların yanına realistik **tələlər (decoy)** yerləşdiririk: saxta svetofor kontrolleri, saxta şəhər portalı, canary token faylı, saxta kamera. **Heç bir qanuni istifadəçi tələyə toxunmur** → tələyə dəyən hər müraciət sıfır yanlış-pozitivli, ən yüksək etibarlı təhlükə siqnalıdır. Eyni zamanda mühərrik şəhərin hadisə axınını (normal + şübhəli) da analiz edir və hamısının üzərində **anomaliya aşkarlama + təsnifat + risk qiymətləndirmə + MITRE ATT&CK etiketləmə** aparır.

## Əsas funksiyalar
- 🎯 **4 Tələ (Decoy):** saxta svetofor, saxta portal, canary token, saxta kamera.
- 🧠 **3 qatlı Sİ:** (1) IsolationForest anomaliya aşkarlama (ML), (2) hibrid ML+qayda təsnifat və risk, (3) opsional LLM hesabat.
- 📊 **Kiber-insident paneli:** şəhər şəbəkə xəritəsi, canlı siqnal axını, risk səviyyələri, MITRE ATT&CK etiketləri.
- 📈 **Hər hadisə üçün risk balı** və anomaliya balı.
- 📝 **Azərbaycanca insident hesabatı** + niyə yüksək riskli olduğunun izahı.
- 🔴 **Hücum simulyatoru** — bir düymə ilə bütün zənciri canlı işə salır.

## Texnologiya steki
- **Backend:** Python 3 · FastAPI · uvicorn (vəziyyət yaddaşda saxlanılır, verilənlər bazası yoxdur).
- **Maşın öyrənməsi:** scikit-learn **IsolationForest** (kiçik, lokal, izah edilə bilən).
- **Frontend:** React (Vite, sadə JavaScript) · tünd "SOC konsolu" dizaynı.
- **Canlı yenilənmə:** frontend hər 1 saniyədə `GET /api/state` sorğusu göndərir.
- **LLM (opsional):** Claude (`claude-sonnet-4-6`) — yalnız `ANTHROPIC_API_KEY` varsa; əks halda offline şablon hesabat işləyir.

### İstifadə olunan açıq mənbə kitabxanalar (açıqlama)
FastAPI, uvicorn, scikit-learn, numpy, pandas, python-multipart, React, Vite və (opsional) Anthropic Claude API. Tam siyahı: [`requirements.txt`](requirements.txt) və [`src/frontend/package.json`](src/frontend/package.json).

## Necə işə salınır
**Tələblər:** Windows · Python 3 · Node.js (artıq quraşdırılıb).

**Ən sadə yol** — layihə qovluğunda:
```
run.bat
```
Bu, iki pəncərə açır (Backend 8000, Frontend 5173). Sonra brauzerdə açın: **http://localhost:5173**

**Əl ilə (iki ayrı terminal):**
```
REM 1-ci terminal (backend)
.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000 --app-dir src\backend

REM 2-ci terminal (frontend)
cd src\frontend
npm run dev
```

## Demo giriş məlumatları
Paneli görmək üçün **giriş (login) tələb olunmur** — dashboard birbaşa açılır. (Saxta portal tələsi isə qəsdən hər parolu "qəbul edir" ki, brute-force cəhdlərini qeydə alsın — bu, real giriş deyil, tələdir.)

## Nümunə data
[`data/sample-data.csv`](data/sample-data.csv) — ağıllı şəhər giriş loglarının nümunəsi (normal + şübhəli trafik qarışığı). Mühərrik bu faylı da analiz edir. (Faza 3-də doldurulur.)

## Məhdudiyyətlər
- Bu, **MVP (minimum işlək məhsul)** prototipidir, real istehsalat sistemi deyil.
- Vəziyyət yaddaşda saxlanılır — server söndükdə data sıfırlanır (verilənlər bazası yoxdur).
- Hər şey lokal mühitdə işləyir; real qurğulara qoşulmur.
- ML modeli yanlış-pozitiv verə bilər, LLM "uydurma" (hallucination) edə bilər → buna görə **insan təsdiqi** saxlanılır.

## Gələcək inkişaf imkanları
- Real qurğu log-agent inteqrasiyası (passiv log oxuma).
- Daha çox tələ şablonu (sayğac, PLC, IoT gateway).
- Mərkəzi konsol + çox-saytlı (multi-tenant) idarəetmə.
- WebSocket ilə real-vaxt push (poll əvəzinə).

## Etik və hüquqi qeydlər
Hər şey bizim öz təcrid olunmuş lokal mühitimizdə işləyir. Heç bir real sistemə, şəbəkəyə və ya üçüncü tərəfə hücum etmirik. "Hücumçu" bizim öz simulyasiya skriptimizdir. Tələlərdə yalnız **saxta data** var — real vətəndaş məlumatı yoxdur. Həll **tamamilə müdafiə xarakterlidir**. Detallar: [`docs/ethical-declaration.md`](docs/ethical-declaration.md).

---

### Sİ harada işləyir? (qısa)
**ML — Sİ-nin bir alt çoxluğudur, alternativi deyil.** Biz Sİ-ni 3 qatda işlədirik:
1. **Aşkarlama (ML):** IsolationForest normal trafiki öyrənir, anomaliyanı tapır.
2. **Təsnifat/qərar (ML + qayda):** təhlükə sinfi + risk səviyyəsi (tələ vurğusu → həmişə yüksək).
3. **Cavab/izah (LLM, opsional):** Azərbaycanca hesabat və izah.

**İnsan-dövrədə (human-in-the-loop):** *"Sİ hazırlayır, insan təsdiqləyir."* Sistem analitikin işini ~10 dəfə azaldır, sıfıra endirmir.
