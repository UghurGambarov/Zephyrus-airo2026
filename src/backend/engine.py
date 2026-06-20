# =====================================================================
# Zephyrus — AŞKARLAMA MÜHƏRRİKİ (layihənin ÜRƏYİ)
# ---------------------------------------------------------------------
# Bu fayl Sİ-nin yaşadığı yerdir. ML — Sİ-nin bir ALT ÇOXLUĞUDUR.
# Biz 2 qatı burada həyata keçiririk (3-cü qat — LLM hesabat — Faza 6/7-də):
#
#   QAT 1 — AŞKARLAMA (Maşın Öyrənməsi):
#     scikit-learn IsolationForest modeli "normal" şəhər trafikini öyrənir
#     və ANOMALİYANI (qeyri-adi davranışı) tapır. Niyə ML?
#     → Sadə qaydalar yalnız MƏLUM hücumları tutur.
#     → ML əvvəl GÖRÜNMƏMİŞ anomaliyaları da tuta bilir.
#
#   QAT 2 — TƏSNİFAT və QƏRAR (hibrid: ML + qaydalar):
#     Anomaliya balını deterministik qaydalarla birləşdirib təhlükə sinfini,
#     risk səviyyəsini (aşağı/orta/yüksək) və MITRE ATT&CK etiketini təyin edir.
#     Tələ (decoy) vurğusu → həmişə "yüksək" (sıfır yanlış-pozitiv).
#
# Bütün modelin işi LOKALDIR — internet lazım deyil → demo həmişə işləyir.
# =====================================================================

from datetime import datetime

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


# ---------------------------------------------------------------------
# ML ÜÇÜN ƏLAMƏTLƏR (features) — hər biri Azərbaycanca izah olunur.
# Bir hadisəni 4 ədədlə təsvir edirik:
#   1) saat          — hadisənin baş verdiyi saat (0–23). Gecə/iş-kənarı giriş şübhəlidir.
#   2) son_deqiqe    — bu IP-nin son 60 saniyədə göndərdiyi sorğu sayı. Çox → skan partlayışı.
#   3) ferqli_cihaz  — bu IP-nin toxunduğu FƏRQLİ cihaz sayı. Çox → kəşfiyyat/skan.
#   4) ugursuz       — əməliyyat uğursuz oldumu (1/0). Təkrar uğursuzluq → brute-force.
# ---------------------------------------------------------------------
ELAMET_ADLARI = ["saat", "son_deqiqe", "ferqli_cihaz", "ugursuz"]


def _normal_baseline(n=800):
    """
    Modeli öyrətmək üçün REALİSTİK "NORMAL" şəhər trafikini yaradırıq.
    ÖNƏMLİ: normal data KƏSİLMİŞ deyil, davamlı və "quyruqlu" olmalıdır —
    yəni nadir hallarda normal istifadəçi də bir az çox sorğu göndərə bilər.
    Belə olmasa, model "bir az qeyri-adi" ilə "çox qeyri-adi"-ni ayıra bilməz.
      - saat         : iş saatları ətrafında (orta ~14), gecə nadirdir.
      - son_deqiqe   : əsasən 1–3, NADİR hallarda 6–10 (qanuni yüklənmə).
      - ferqli_cihaz : əsasən 1, bəzən 2–3 cihaz.
      - ugursuz      : ~3% qanuni uğursuz giriş (parolu səhv yazmaq).
    Model bu "normal buludu" öyrənir; ondan uzaq nöqtələr anomaliya sayılır.
    """
    rng = np.random.default_rng(42)  # təkrarlanan nəticə üçün sabit toxum
    saat = np.clip(rng.normal(14, 3, n), 0, 23)          # iş saatları ətrafında
    son_deqiqe = np.clip(rng.poisson(1.5, n) + 1, 1, 12)  # quyruqlu: əsasən az, nadir çox
    ferqli_cihaz = np.clip(rng.poisson(0.4, n) + 1, 1, 6) # əsasən 1, bəzən 2–3
    ugursuz = (rng.random(n) < 0.03).astype(float)        # ~3% uğursuz cəhd
    return np.column_stack([saat, son_deqiqe, ferqli_cihaz, ugursuz])


# --- Modeli bir dəfə (server başlayanda) öyrədirik ---
# ÖNƏMLİ: əvvəlcə StandardScaler ilə əlamətləri eyni şkalaya gətiririk.
# Niyə? "saat" (0–23) digər əlamətlərdən (1–6) qat-qat geniş diapazona malikdir.
# Şkalalama olmasa, model demək olar yalnız saata baxar və skan/brute-force
# kimi siqnalları zəif tutar. Şkalalamadan sonra hər əlamət ədalətli töhfə verir.
_BASELINE = _normal_baseline()
_MODEL = make_pipeline(
    StandardScaler(),
    IsolationForest(
        n_estimators=200,     # 200 təsadüfi ağac
        contamination=0.02,   # normal datada ~2% kənar nöqtə gözləyirik
        random_state=42,      # təkrarlanan nəticə
    ),
).fit(_BASELINE)


# ---------------------------------------------------------------------
# ANOMALİYA BALINI 0–100 ŞKALASINA ÇEVİRMƏK (kalibrləmə).
# IsolationForest "decision_function" verir: müsbət = normal, mənfi = anomal.
# Bizim yanaşma (şəffaf və izah edilə bilən): bir nöqtə normal trafikin
# ortalamasından NEÇƏ STANDART SAPMA aşağıdadırsa, o qədər anomaldır.
#   - Normal nöqtə → ~0 sapma → bal ~0
#   - Aydın hücum → bir neçə sapma aşağı → bal yüksək (70–100)
# Kalibrləməni (ortalama və sapma) server başlayanda bir dəfə hesablayırıq.
# ---------------------------------------------------------------------
_D_NORMAL = _MODEL.decision_function(_BASELINE)
_MU = float(_D_NORMAL.mean())            # normal trafikin ortalama "normallıq" dəyəri
_SD = float(_D_NORMAL.std()) or 1e-6     # normal trafikin yayılması (sıfır olmasın)

# Hər standart sapma üçün neçə bal? ~4.5 sapma aşağı = 100 bal.
_BAL_EMSALI = 22


def _bal_0_100(decision_value: float) -> int:
    """decision_function dəyərini 0–100 anomaliya balına çevirir (z-bal əsasında)."""
    z = (_MU - decision_value) / _SD     # normal ortalamadan neçə sapma AŞAĞI
    return int(max(0, min(100, round(z * _BAL_EMSALI))))


# ---------------------------------------------------------------------
# TƏLƏ (decoy) → təhlükə təsnifatı xəritəsi.
# Tələlər deterministikdir: hansı tələnin vurulduğu birbaşa təhlükəni göstərir.
# (T0846 — ATT&CK for ICS; sənaye nəzarət sistemləri üçün.)
# ---------------------------------------------------------------------
TELE_XERITESI = {
    "traffic_light": {
        "threat_class": "İcazəsiz SCADA/ICS Girişi",
        "mitre": "T0846", "mitre_ad": "Uzaq Sistem Kəşfi (ICS)",
        "reason": "Saxta svetofor kontrollerinə (SCADA/Modbus tələsi) icazəsiz giriş edildi.",
    },
    "portal": {
        "threat_class": "Brute Force / Parol Hücumu",
        "mitre": "T1110", "mitre_ad": "Brute Force",
        "reason": "Saxta şəhər portalına giriş cəhdi edildi (parol sınağı / brute-force siqnalı).",
    },
    "canary": {
        "threat_class": "Məxfi Məlumata Giriş (Canary)",
        "mitre": "T1552", "mitre_ad": "Qorunmamış Etimadnamələr",
        "reason": "Canary token faylı (saxta admin parolları) oxundu — sızma cəhdinin güclü əlaməti.",
    },
    "camera": {
        "threat_class": "İcazəsiz Kamera/Cihaz Girişi",
        "mitre": "T0846", "mitre_ad": "Cihaz Kəşfi (ICS/IoT)",
        "reason": "Saxta kamera axınına (RTSP/HTTP tələsi) icazəsiz giriş edildi.",
    },
}


def extract_features(event, all_events):
    """
    Bir hadisədən ML üçün 4 ədədlik əlamət vektoru çıxarır.
    all_events: bütün keçmiş hadisələr (eyni IP-nin davranışına baxmaq üçün).
    """
    ts = datetime.fromisoformat(event["timestamp"])
    saat = ts.hour
    ip = event["source_ip"]

    # Bu IP-nin son 60 saniyədəki hadisələri (bu hadisə də daxil).
    window_start = ts.timestamp() - 60
    recent = [
        e for e in all_events
        if e["source_ip"] == ip
        and datetime.fromisoformat(e["timestamp"]).timestamp() >= window_start
    ]
    son_deqiqe = len(recent)
    ferqli_cihaz = len(set(e["source_kind"] for e in recent))
    ugursuz = 1 if event.get("failed") else 0

    vektor = [saat, son_deqiqe, ferqli_cihaz, ugursuz]
    # Köməkçi məlumat (təsnifat və izah üçün).
    info = {
        "saat": saat,
        "son_deqiqe": son_deqiqe,
        "ferqli_cihaz": ferqli_cihaz,
        "ugursuz": ugursuz,
        "is_kenari": saat < 7 or saat >= 21,   # gecə/iş-kənarı saat?
    }
    return vektor, info


def score_anomaly(vektor):
    """ML modeli ilə anomaliya balını (0–100) hesablayır."""
    X = np.array([vektor], dtype=float)
    d = float(_MODEL.decision_function(X)[0])
    return _bal_0_100(d)


def _izah_yarat(bal, info):
    """Anomaliya balının NİYƏ yüksək olduğunu Azərbaycanca izah edir (explainability)."""
    siqnallar = []
    if info["is_kenari"]:
        siqnallar.append(f"iş-kənarı saatda giriş (saat {info['saat']})")
    if info["son_deqiqe"] >= 4:
        siqnallar.append(f"qısa müddətdə çox sorğu ({info['son_deqiqe']}/dəq — skan partlayışı)")
    if info["ferqli_cihaz"] >= 3:
        siqnallar.append(f"çox sayda fərqli cihaza müraciət ({info['ferqli_cihaz']} cihaz — kəşfiyyat)")
    if info["ugursuz"]:
        siqnallar.append("uğursuz giriş cəhdi")
    if siqnallar:
        return f"Anomaliya balı {bal}/100. Səbəb: " + "; ".join(siqnallar) + "."
    return f"Anomaliya balı {bal}/100. Trafik normaldan bir qədər kənardır."


def classify_stream(info, bal):
    """
    QAT 2 — şəhər axını hadisəsini təsnif edir (tələ DEYİL).
    Hibrid məntiq: əvvəlcə davranış qaydaları, sonra anomaliya balı.
    Qaytarır: təhlükə sinfi, MITRE, MITRE adı, risk, izah.
    """
    # --- Təhlükə sinfini qaydalarla təyin et ---
    if info["ferqli_cihaz"] >= 3:
        threat_class, mitre, mitre_ad = "Kəşfiyyat / Şəbəkə Skanı", "T1046", "Şəbəkə Xidməti Kəşfi"
    elif info["ugursuz"] and info["son_deqiqe"] >= 3:
        threat_class, mitre, mitre_ad = "Brute Force / Parol Hücumu", "T1110", "Brute Force"
    elif info["is_kenari"]:
        threat_class, mitre, mitre_ad = "İcazəsiz Giriş", "T1078", "Etibarlı Hesablardan Sui-istifadə"
    elif bal >= 60:
        threat_class, mitre, mitre_ad = "Anomal Davranış", "T1595", "Aktiv Skanlama"
    else:
        threat_class, mitre, mitre_ad = "Normal Fəaliyyət", "-", "-"

    # --- Risk səviyyəsini təyin et (anomaliya balı + sinif) ---
    if threat_class == "Normal Fəaliyyət":
        risk = "yüksək" if bal >= 80 else ("orta" if bal >= 50 else "aşağı")
    elif threat_class == "Brute Force / Parol Hücumu":
        risk = "yüksək" if (info["ugursuz"] and info["son_deqiqe"] >= 5) else "orta"
    elif bal >= 70:
        risk = "yüksək"
    else:
        risk = "orta"

    return threat_class, mitre, mitre_ad, risk


def build_alert(event, all_events, is_decoy, source_kind):
    """
    Bir hadisə üçün TAM təhlükə siqnalını qurur (həm tələ, həm axın üçün).
    Bu, mühərrikin əsas giriş nöqtəsidir — decoys.py və attacker bunu çağırır.
    """
    vektor, info = extract_features(event, all_events)
    bal = score_anomaly(vektor)  # QAT 1 — ML anomaliya balı (hər zaman hesablanır)

    if is_decoy:
        # Tələ vurğusu: deterministik təsnifat + həmişə yüksək risk.
        m = TELE_XERITESI[source_kind]
        threat_class = m["threat_class"]
        mitre, mitre_ad = m["mitre"], m["mitre_ad"]
        risk = "yüksək"
        reason = m["reason"] + f" (ML anomaliya balı: {bal}/100)"
    else:
        # Şəhər axını: QAT 2 hibrid təsnifat (ML + qaydalar).
        threat_class, mitre, mitre_ad, risk = classify_stream(info, bal)
        reason = _izah_yarat(bal, info)

    return {
        "event_id": event["id"],
        "timestamp": event["timestamp"],
        "time": event["time"],
        "source_ip": event["source_ip"],
        "source_kind": source_kind,
        "is_decoy": is_decoy,
        "threat_class": threat_class,
        "mitre": mitre,
        "mitre_ad": mitre_ad,
        "risk": risk,
        "anomaly_score": bal,            # ML balı (0–100)
        "features": info,                # şəffaflıq üçün əlamətlər
        "reason": reason,                # NİYƏ bu qiymət verildi (izah)
        "admin_alert": "Administrator xəbərdar edildi (simulyasiya).",
    }
