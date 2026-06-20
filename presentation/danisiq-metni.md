# 🎤 Demo Çıxışı üçün Danışıq Mətni (5 dəqiqə) — Zephyrus · City Trap

> Bu mətn komandanın münsiflər qarşısında danışması üçündür. Sadə dildə yazılıb.
> 5 əsas qiymətləndirmə nöqtəsinə uyğun qurulub. Hər bölmənin yanında təxmini vaxt var.

---

## 0) Açılış (15 saniyə)
"Salam. Biz **Zephyrus** komandasıyıq. Layihəmiz **City Trap** — ağıllı şəhər sistemləri
üçün **Sİ əsaslı kibertəhlükə aşkarlama** platformasıdır. Əsas fikrimiz: real qurğuların
yanına **tələlər (decoy)** qoyub, onları bir **Sİ mühərriki** ilə birləşdirməkdir."

---

## 1) Hansı problem? (45 saniyə)
"Ağıllı şəhər minlərlə qurğudan ibarətdir: svetoforlar, kameralar, sayğaclar, SCADA
sistemləri, şəhər portalları. Bu qurğular çox vaxt **köhnə protokollar**, **default
parollar** və **zəif izolyasiya** ilə işləyir.

Problem: hücumlar **gec aşkarlanır**. Çünki hücumçu əvvəlcə sakitcə kəşfiyyat aparır,
insan analitik isə minlərlə log sətrini əl ilə oxuya bilmir."

---

## 2) Necə işləyir? (90 saniyə — DEMO)
"İki şeyi birləşdiririk:

**Birincisi — Aldatma Şəbəkəsi.** Real qurğuların yanına saxta qurğular qoyuruq:
saxta svetofor, saxta portal, canary fayl, saxta kamera. **Heç bir qanuni istifadəçi
tələyə toxunmur** — deməli tələyə dəyən hər müraciət demək olar ki, hücumdur.
Bu, **sıfır yanlış-pozitiv**, ən etibarlı siqnaldır.

**İkincisi — Sİ Aşkarlama Mühərriki.** *(Burada "🔴 Hücumu Başlat" düyməsinə basın.)*
Görürsünüz: **Simulyasiya İdarə Mərkəzi** açıldı və hücumçunun səyahətini mərhələ-mərhələ
danışır — kəşfiyyat, brute-force, data sızması. Eyni anda **şəhər xəritəsində**
qovşaqlar bir-bir yanır: sarı = şübhəli skan, qırmızı = aktiv hücum. Sağda isə **canlı
siqnallar** real-vaxt axır — hər birində təhlükə sinfi, **risk səviyyəsi**, **MITRE
ATT&CK** etiketi və **ML anomaliya balı**.

İstənilən siqnala klikləyəndə sağda **Azərbaycanca insident hesabatı** açılır: nə baş
verdi, **niyə yüksək risk verildi** və tövsiyə olunan addımlar."

*(İstəyə görə: "📂 Log Analiz Mərkəzi"-ni göstərin — real Syslog/Windows/CEF faylını
yükləyib, çeviricinin onu necə avtomatik analiz etdiyini göstərin.)*

---

## 3) Sİ harada işləyir? (45 saniyə)
"Vacib nüans: **ML — Sİ-nin bir alt çoxluğudur, alternativi deyil.** Biz Sİ-ni **3 qatda**
işlədirik:
1. **Aşkarlama (ML):** scikit-learn IsolationForest normal trafiki öyrənir və
   əvvəl görünməmiş anomaliyaları tapır.
2. **Təsnifat və qərar (ML + qaydalar):** təhlükə sinfi, risk səviyyəsi, MITRE etiketi.
3. **Cavab (LLM, opsional):** Azərbaycanca hesabat və izah.

Və ən önəmlisi — **insan-dövrədə**: *'Sİ hazırlayır, insan təsdiqləyir.'* Sistem
analitikin işini ~10 dəfə azaldır, amma son qərarı insan verir."

---

## 4) Kibertəhlükəsizlik dəyəri (40 saniyə)
"Dəyərimiz nədir?
- **Erkən aşkarlama:** hücumçunu kəşfiyyat mərhələsində, zərər verməzdən əvvəl tuturuq.
- **Sıfır yanlış-pozitiv siqnal:** tələ vurğusu 100% etibarlıdır.
- **MITRE ATT&CK xəritələməsi:** hər hadisəni beynəlxalq standartla etiketləyirik.
- **İki müstəqil siqnal:** aldatma (tələ) + statistik anomaliya (ML) bir-birini gücləndirir."

---

## 5) Texniki işləklik və miqyaslanma (30 saniyə)
"Hər şey **lokal** işləyir — internet lazım deyil, ona görə demo həmişə işləyir.
Miqyaslanma üçün: şəhərdə minlərlə fərqli konfiqurasiya yox, bir neçə cihaz **modeli** var.
Hər model üçün **bir tələ şablonu** qurub təkrarlayırıq. Bir mərkəzi konsol çoxlu saytı
idarə edir. **Yeni cihaz növü = yeni tələ şablonu.**"

---

## 6) Etik və hüquqi uyğunluq (25 saniyə)
"Həll **tamamilə müdafiə xarakterlidir**. Hər şey öz təcrid olunmuş mühitimizdə işləyir.
Heç bir real sistemə toxunmuruq — 'hücumçu' bizim öz skriptimizdir. Tələlərdə yalnız
**saxta data** var, real vətəndaş məlumatı yoxdur. Öz tələmizi müşahidə etmək tələ qurma
(entrapment) deyil — biz heç kəsi təhrik etmirik."

---

## 7) Yekun (15 saniyə)
"City Trap — aldatma və Sİ-ni birləşdirən, analitikin işini 10 dəfə azaldan, lakin insanı
dövrədə saxlayan müdafiə platformasıdır. Təşəkkür edirik."

---

# ❓ Münsiflərin Ehtimal Olunan Sualları (hazır cavablar)

**S: Sİ-ni harada işlədirsiniz?**
C: 3 qatda — IsolationForest ML aşkarlama, hibrid ML+qayda təsnifat, opsional LLM hesabat.

**S: ML, yoxsa Sİ?**
C: ML — Sİ-nin alt çoxluğudur. Biz hər ikisini işlədirik; ML statistik anomaliyanı, qaydalar
isə məlum nümunələri tutur.

**S: Bəs Sİ səhv etsə?**
C: Buna görə **insan-dövrədə** modelini saxlayırıq. ML yanlış-pozitiv verə bilər, LLM uydura
bilər — son təsdiqi analitik verir. Biz işi 10 dəfə azaldırıq, sıfıra yox.

**S: Niyə sadəcə bloklamırsınız?**
C: Avtomatik bloklama qanuni xidməti də dayandıra bilər (yanlış-pozitiv riski). Biz aşkarlayıb
analitikə təqdim edirik; tələ vurğusu kimi 100% əmin hallarda avtomatik reaksiya əlavə oluna bilər.

**S: Hücumçu tələni tanısa?**
C: Tələlər real qurğulardan fərqlənmir (eyni protokol, eyni cavablar). Üstəlik biz təkcə tələyə
yox, **kəşfiyyat davranışına** da baxırıq — hücumçu tələdən qaçsa belə, ML onu anomaliya kimi tutur.

**S: Real svetoforda necə işləyir? Necə miqyaslanır?**
C: Real qurğuya toxunmuruq. Yanına (a) yüngül tələ, (b) passiv log axını qoyuruq. Sinif əsaslı
şablonlarla minlərlə qurğunu az konfiqurasiya ilə əhatə edirik. Bu, real Paylanmış Aldatma
Platformalarının (DDP) modelidir.

**S: Köhnə loglarımızı necə analiz edəcəksiniz?**
C: **Log Analiz Mərkəzi** + **Çevirici** ilə. Syslog, Windows Event, CEF/LEEF fayllarını
yükləyirsiniz, çevirici sahələri avtomatik xəritələyir, ML mühərriki hər sətrə risk balı verir.
Heç nəyi əl ilə yenidən yazmırsınız.

**S: Datanız haradandır?**
C: Simulyasiya edilmiş dataset — `data/sample-data.csv` (normal + şübhəli) və öz hücum
simulyatorumuz (`attacker.py`). Hamısı təkrarlana bilən şəkildə skriptlə yaradılır.
