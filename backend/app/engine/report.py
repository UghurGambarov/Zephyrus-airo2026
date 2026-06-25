"""Layer 3 — incident report generation (response & explanation).

Default path is a deterministic offline template (always works, no internet).
Optionally, if ANTHROPIC_API_KEY is set, Claude enriches the report; on any
error it silently falls back to the template. Human-in-the-loop is preserved.

Report payload keys are English; the text content is Azerbaijani (user-facing).
"""

from app.core.config import settings


def _recommendations(alert) -> list:
    threat_class = alert.get("threat_class", "")
    is_decoy = alert.get("is_decoy", False)
    ip = alert.get("source_ip", "naməlum")

    steps = [f"Mənbə IP ünvanını ({ip}) dərhal şəbəkə səviyyəsində blokla/təcrid et."]

    if is_decoy:
        steps.append(
            "Bu, TƏLƏYƏ (decoy) düşmədir — qanuni istifadəçi tələyə toxunmaz, "
            "ona görə bu siqnal demək olar 100% həqiqi hücumdur."
        )
    if "SCADA" in threat_class or "Kamera" in threat_class or "ICS" in threat_class:
        steps.append("Eyni sinifdən olan REAL cihazı (svetofor/kamera) yoxla — hücumçu real qurğunu da hədəfləyə bilər.")
        steps.append("OT/ICS seqmentini IT şəbəkəsindən izolyasiya et və PLC/firmware bütövlüyünü təsdiqlə.")
    if "Brute Force" in threat_class or "Parol" in threat_class:
        steps.append("Hesab kilidləmə (account lockout) və çoxfaktorlu autentifikasiyanı (MFA) tətbiq et.")
        steps.append("Hədəflənmiş hesabların parollarını sıfırla.")
    if "Canary" in threat_class or "Məxfi" in threat_class:
        steps.append("Canary oxundu — bu, məlumat sızması cəhdinin GÜCLÜ əlamətidir. Bütün admin etimadnamələrini rotasiya et (dəyiş).")
        steps.append("Cinayət-texniki (forensic) təhlil üçün loqları və yaddaş şəkillərini saxla.")
    if "Bankomat" in threat_class or "Jackpotting" in threat_class:
        steps.append("Yaxınlıqdakı REAL bankomatları (Bankomat #1/#2) dərhal xidmətdən çıxar və fiziki yoxlamadan keçir.")
        steps.append(
            "Bank prosessinq şəbəkəsini izolyasiya et, kart əməliyyatlarını monitorinqə götür "
            "və maliyyə təhlükəsizliyi qrupunu xəbərdar et."
        )
    if "Kəşfiyyat" in threat_class or "Skan" in threat_class:
        steps.append("Firewall qaydalarını sərtləşdir və bu IP-dən gələn skan trafikini izlə.")

    steps.append("Analitik təsdiqi: Sİ bu hesabatı HAZIRLADI; yekun qərarı (eskalasiya/bağlama) insan verir.")
    return steps


def _explanation(alert) -> str:
    f = alert.get("features", {}) or {}
    score = alert.get("anomaly_score", 0)
    lines = []

    if alert.get("is_decoy"):
        lines.append("Mənbə birbaşa bir TƏLƏYƏ (decoy) toxundu — qanuni istifadəçinin heç vaxt etmədiyi hərəkət.")
    if f.get("off_hours"):
        lines.append(f"Giriş iş-kənarı saatda baş verdi (saat {f.get('hour')}).")
    if f.get("last_minute", 0) >= 4:
        lines.append(f"Qısa müddətdə çox sorğu göndərildi ({f.get('last_minute')}/dəqiqə) — skan partlayışı.")
    if f.get("distinct_devices", 0) >= 3:
        lines.append(f"Çox sayda fərqli cihaza müraciət edildi ({f.get('distinct_devices')}) — kəşfiyyat davranışı.")
    if f.get("failed"):
        lines.append("Əməliyyat uğursuz oldu — təkrar uğursuzluq parol hücumunu göstərir.")

    head = f"Maşın öyrənməsi (IsolationForest) modeli bu hadisəni {score}/100 anomaliya balı ilə qiymətləndirdi. "
    if lines:
        return head + "Səbəblər: " + " ".join(lines)
    return head + "Davranış normal trafik profilindən kənara çıxdı."


def template_report(alert) -> dict:
    """Build the deterministic (offline) Azerbaijani incident report."""
    risk = alert.get("risk", "naməlum")
    threat_class = alert.get("threat_class", "naməlum")
    ip = alert.get("source_ip", "naməlum")
    time = alert.get("time", "")
    mitre = alert.get("mitre", "-")
    mitre_name = alert.get("mitre_name", "")
    score = alert.get("anomaly_score", 0)

    summary = (
        f"Saat {time}-də {ip} ünvanından '{threat_class}' kateqoriyalı təhlükə aşkarlandı. "
        f"Risk səviyyəsi: {risk.upper()}. ML anomaliya balı: {score}/100. "
        f"MITRE ATT&CK təsnifatı: {mitre} ({mitre_name}). "
        f"Administrator avtomatik xəbərdar edildi (simulyasiya)."
    )

    number = alert.get("event_id", alert.get("id", "?"))
    return {
        "source": "template",
        "title": f"İNSİDENT HESABATI #{number}",
        "summary": summary,
        "explanation": _explanation(alert),
        "recommendations": _recommendations(alert),
    }


def ai_report(alert) -> dict:
    """Enrich the report with Claude if an API key is set; else return template."""
    template = template_report(alert)
    api_key = settings.anthropic_api_key
    if not api_key:
        return template

    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)
        prompt = (
            "Sən kibertəhlükəsizlik SOC analitikisən. Aşağıdakı insident məlumatına "
            "əsasən QISA, peşəkar, AZƏRBAYCANCA insident hesabatı yaz. "
            "3 hissə olsun: 1) Xülasə, 2) Niyə bu risk verildi, 3) Tövsiyə olunan addımlar.\n\n"
            f"Təhlükə sinfi: {alert.get('threat_class')}\n"
            f"Risk: {alert.get('risk')}\n"
            f"Mənbə IP: {alert.get('source_ip')}\n"
            f"MITRE ATT&CK: {alert.get('mitre')} ({alert.get('mitre_name')})\n"
            f"Anomaliya balı: {alert.get('anomaly_score')}/100\n"
            f"Əlamətlər: {alert.get('features')}\n"
            f"Tələyə düşmə: {alert.get('is_decoy')}\n"
        )
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in msg.content if hasattr(b, "text"))
        template["source"] = "claude-llm"
        template["ai_text"] = text.strip()
        return template
    except Exception:
        return template
