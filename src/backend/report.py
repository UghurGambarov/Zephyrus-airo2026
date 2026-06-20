# =====================================================================
# Zephyrus — İNSİDENT HESABATI GENERATORU (QAT 3 — Cavab və İzah)
# ---------------------------------------------------------------------
# Bu modul aşkarlama mühərrikinin (engine.py) qurduğu bir SİQNALI
# insan üçün oxunaqlı AZƏRBAYCANCA insident hesabatına çevirir:
#   1) Qısa xülasə    — nə baş verdi?
#   2) NİYƏ izahı      — model bunu niyə bu riskdə qiymətləndirdi? (explainability)
#   3) Tövsiyələr      — analitik nə etməlidir? (cavab addımları)
#
# Sİ STRATEGİYASI (vacib):
#   - ƏSAS (default) yol DETERMİNİSTİK ŞABLONDUR → internet/API LAZIM DEYİL,
#     həmişə işləyir. Demo heç vaxt internetə asılı deyil.
#   - OPSİONAL olaraq, əgər ANTHROPIC_API_KEY mühit dəyişəni varsa, əlavə
#     olaraq Claude LLM çağırılır (try/except içində). Səhv olarsa, səssizcə
#     şablona qayıdır. (Bu hissə /api/report/{id}/ai endpoint-ində istifadə olunur.)
#
# İNSAN DÖVRƏDƏDİR (human-in-the-loop): hesabatı Sİ HAZIRLAYIR, son qərarı
# İNSAN (analitik) verir. Biz analitikin işini ~10 dəfə azaldırıq, sıfıra yox.
# =====================================================================

import os


# ---------------------------------------------------------------------
# TƏHLÜKƏ SİNFİNƏ GÖRƏ TÖVSİYƏ OLUNAN CAVAB ADDIMLARI.
# Hər təhlükə növü üçün analitikə konkret, praktik addımlar veririk.
# Bu, "AI yalnız xəbərdarlıq edir" deyil — "AI həll də təklif edir" deməkdir.
# ---------------------------------------------------------------------
def _tovsiyeler(alert) -> list:
    risk = alert.get("risk")
    sinif = alert.get("threat_class", "")
    is_decoy = alert.get("is_decoy", False)
    ip = alert.get("source_ip", "naməlum")

    # Demək olar bütün hallarda ilk addım — mənbəni təcrid etmək.
    addimlar = [f"Mənbə IP ünvanını ({ip}) dərhal şəbəkə səviyyəsində blokla/təcrid et."]

    if is_decoy:
        # Tələ vurğusu = sıfır yanlış-pozitiv → ən yüksək prioritet.
        addimlar.append("Bu, TƏLƏYƏ (decoy) düşmədir — qanuni istifadəçi tələyə toxunmaz, ona görə bu siqnal demək olar 100% həqiqi hücumdur.")

    if "SCADA" in sinif or "Kamera" in sinif or "ICS" in sinif:
        addimlar.append("Eyni sinifdən olan REAL cihazı (svetofor/kamera) yoxla — hücumçu real qurğunu da hədəfləyə bilər.")
        addimlar.append("OT/ICS seqmentini IT şəbəkəsindən izolyasiya et və PLC/firmware bütövlüyünü təsdiqlə.")
    if "Brute Force" in sinif or "Parol" in sinif:
        addimlar.append("Hesab kilidləmə (account lockout) və çoxfaktorlu autentifikasiyanı (MFA) tətbiq et.")
        addimlar.append("Hədəflənmiş hesabların parollarını sıfırla.")
    if "Canary" in sinif or "Məxfi" in sinif:
        addimlar.append("Canary oxundu — bu, məlumat sızması cəhdinin GÜCLÜ əlamətidir. Bütün admin etimadnamələrini rotasiya et (dəyiş).")
        addimlar.append("Cinayət-texniki (forensic) təhlil üçün loqları və yaddaş şəkillərini saxla.")
    if "Kəşfiyyat" in sinif or "Skan" in sinif:
        addimlar.append("Firewall qaydalarını sərtləşdir və bu IP-dən gələn skan trafikini izlə.")

    # Yekun addım — insan təsdiqi (human-in-the-loop).
    addimlar.append("Analitik təsdiqi: Sİ bu hesabatı HAZIRLADI; yekun qərarı (eskalasiya/bağlama) insan verir.")
    return addimlar


def _niye_izahi(alert) -> str:
    """Modelin NİYƏ bu qiyməti verdiyini sadə dillə izah edir (explainability)."""
    f = alert.get("features", {}) or {}
    bal = alert.get("anomaly_score", 0)
    setirler = []

    if alert.get("is_decoy"):
        setirler.append("Mənbə birbaşa bir TƏLƏYƏ (decoy) toxundu — qanuni istifadəçinin heç vaxt etmədiyi hərəkət.")
    if f.get("is_kenari"):
        setirler.append(f"Giriş iş-kənarı saatda baş verdi (saat {f.get('saat')}).")
    if f.get("son_deqiqe", 0) >= 4:
        setirler.append(f"Qısa müddətdə çox sorğu göndərildi ({f.get('son_deqiqe')}/dəqiqə) — skan partlayışı.")
    if f.get("ferqli_cihaz", 0) >= 3:
        setirler.append(f"Çox sayda fərqli cihaza müraciət edildi ({f.get('ferqli_cihaz')}) — kəşfiyyat davranışı.")
    if f.get("ugursuz"):
        setirler.append("Əməliyyat uğursuz oldu — təkrar uğursuzluq parol hücumunu göstərir.")

    bas = f"Maşın öyrənməsi (IsolationForest) modeli bu hadisəni {bal}/100 anomaliya balı ilə qiymətləndirdi. "
    if setirler:
        return bas + "Səbəblər: " + " ".join(setirler)
    return bas + "Davranış normal trafik profilindən kənara çıxdı."


def template_report(alert) -> dict:
    """
    DETERMİNİSTİK (offline) Azərbaycanca insident hesabatı qurur.
    Bu, HƏMİŞƏ işləyən əsas yoldur — internet/API lazım deyil.
    """
    risk = alert.get("risk", "naməlum")
    sinif = alert.get("threat_class", "naməlum")
    ip = alert.get("source_ip", "naməlum")
    vaxt = alert.get("time", "")
    mitre = alert.get("mitre", "-")
    mitre_ad = alert.get("mitre_ad", "")
    bal = alert.get("anomaly_score", 0)

    # Qısa xülasə — bir abzas, jurnalist üslubunda (nə/harada/nə vaxt).
    xulase = (
        f"Saat {vaxt}-də {ip} ünvanından '{sinif}' kateqoriyalı təhlükə aşkarlandı. "
        f"Risk səviyyəsi: {risk.upper()}. ML anomaliya balı: {bal}/100. "
        f"MITRE ATT&CK təsnifatı: {mitre} ({mitre_ad}). "
        f"Administrator avtomatik xəbərdar edildi (simulyasiya)."
    )

    # İnsident nömrəsi üçün event_id-dən istifadə edirik (build_alert vaxtı bəllidir).
    nomre = alert.get("event_id", alert.get("id", "?"))
    return {
        "menbe": "şablon",                 # bu hesabat şablonla yaradıldı (offline)
        "basliq": f"İNSİDENT HESABATI #{nomre}",
        "xulase": xulase,
        "niye": _niye_izahi(alert),
        "tovsiyeler": _tovsiyeler(alert),
    }


# =====================================================================
# OPSİONAL — LLM (Claude) ilə daha zəngin hesabat.
# YALNIZ ANTHROPIC_API_KEY varsa işləyir; xəta olarsa şablona qayıdır.
# Bu funksiya polling zamanı YOX, yalnız istifadəçi "Sİ hesabatı" düyməsinə
# basanda çağırılır (sürəti yavaşlatmamaq üçün).
# =====================================================================
def ai_report(alert) -> dict:
    """
    Əgər API açarı varsa, Claude ilə Azərbaycanca hesabat yazır.
    Açar yoxdursa və ya xəta olsa → şablona qayıdır (offline-safe).
    """
    sablon = template_report(alert)
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        # Açar yoxdur → sakitcə şablonu qaytarırıq. Demo dayanmır.
        return sablon

    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)
        # Modelə kontekst veririk; cavabı qısa və Azərbaycanca istəyirik.
        prompt = (
            "Sən kibertəhlükəsizlik SOC analitikisən. Aşağıdakı insident məlumatına "
            "əsasən QISA, peşəkar, AZƏRBAYCANCA insident hesabatı yaz. "
            "3 hissə olsun: 1) Xülasə, 2) Niyə bu risk verildi, 3) Tövsiyə olunan addımlar.\n\n"
            f"Təhlükə sinfi: {alert.get('threat_class')}\n"
            f"Risk: {alert.get('risk')}\n"
            f"Mənbə IP: {alert.get('source_ip')}\n"
            f"MITRE ATT&CK: {alert.get('mitre')} ({alert.get('mitre_ad')})\n"
            f"Anomaliya balı: {alert.get('anomaly_score')}/100\n"
            f"Əlamətlər: {alert.get('features')}\n"
            f"Tələyə düşmə: {alert.get('is_decoy')}\n"
        )
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        metn = "".join(b.text for b in msg.content if hasattr(b, "text"))
        sablon["menbe"] = "claude-llm"
        sablon["ai_metn"] = metn.strip()
        return sablon
    except Exception:
        # İnternet yoxdur, açar səhvdir və ya başqa xəta → şablon işləyir.
        return sablon
