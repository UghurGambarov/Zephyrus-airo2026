# =====================================================================
# Zephyrus — Mərkəzi Yaddaş (Store)
# ---------------------------------------------------------------------
# Bütün hadisələr (events), siqnallar (alerts) və şəhər node-ları burada
# YADDAŞDA saxlanılır. Verilənlər bazası YOXDUR — sadəlik üçün hər şey
# RAM-da yaşayır. Server yenidən başlayanda data sıfırlanır.
#
# Niyə belə? Hackathon MVP-si üçün verilənlər bazası lazımsız mürəkkəblik
# yaradardı. Yaddaşda saxlama həm sadədir, həm də demo üçün kifayətdir.
# =====================================================================

from datetime import datetime
from threading import Lock


# ---------------------------------------------------------------------
# ŞƏHƏR ŞƏBƏKƏSİ NODE-LARI
# Sol paneldə göstərilən ~8 qovşaq. Bəziləri REAL qurğu, bəziləri TƏLƏ.
#   - type="real"  → yaşıl (qanuni qurğu)
#   - type="decoy" → boz (tələ; ona dəyən = hücum siqnalı)
# "kind" sahəsi tələni hadisənin mənbəyi ilə uyğunlaşdırır.
# ---------------------------------------------------------------------
def _ilkin_nodes():
    return [
        {"id": "srv-01",   "ad": "Mərkəzi Server",        "type": "real",  "kind": None,            "status": "normal", "last_hit": None},
        {"id": "tl-01",    "ad": "Svetofor Kontrolleri",  "type": "real",  "kind": None,            "status": "normal", "last_hit": None},
        {"id": "cam-01",   "ad": "Nəzarət Kamerası",      "type": "real",  "kind": None,            "status": "normal", "last_hit": None},
        {"id": "mtr-01",   "ad": "Su Sayğacı Şəbəkəsi",   "type": "real",  "kind": None,            "status": "normal", "last_hit": None},
        # --- 4 TƏLƏ (decoy) ---
        {"id": "d-tl",     "ad": "Saxta Svetofor (tələ)", "type": "decoy", "kind": "traffic_light", "status": "normal", "last_hit": None},
        {"id": "d-portal", "ad": "Saxta Şəhər Portalı",   "type": "decoy", "kind": "portal",        "status": "normal", "last_hit": None},
        {"id": "d-canary", "ad": "Canary Token Faylı",    "type": "decoy", "kind": "canary",        "status": "normal", "last_hit": None},
        {"id": "d-cam",    "ad": "Saxta Kamera (tələ)",   "type": "decoy", "kind": "camera",        "status": "normal", "last_hit": None},
    ]


class Store:
    """Bütün vəziyyəti saxlayan sadə sinif. Bir nüsxəsi yaradılır."""

    def __init__(self):
        # Lock: eyni anda iki sorğu gələrsə, datanı korlanmaqdan qoruyur.
        self._lock = Lock()
        self.reset()

    def reset(self):
        """Hər şeyi ilkin vəziyyətə qaytarır (demo-nu təmizləmək üçün)."""
        with self._lock:
            self.events = []        # bütün xam hadisələr
            self.alerts = []        # aşkarlanmış təhlükə siqnalları
            self.nodes = _ilkin_nodes()
            self._sayğac = 0        # hadisə/siqnal üçün artan nömrə (id)

    def _next_id(self):
        self._sayğac += 1
        return self._sayğac

    def add_event(self, source_ip, source_kind, action, detay):
        """Bir xam hadisəni qeyd edir və onu geri qaytarır."""
        with self._lock:
            indi = datetime.now()
            hadise = {
                "id": self._next_id(),
                "timestamp": indi.isoformat(),
                "time": indi.strftime("%H:%M:%S"),   # ekranda göstərmək üçün
                "source_ip": source_ip,
                "source_kind": source_kind,          # hansı tələ/mənbə
                "action": action,
                "detay": detay,
            }
            self.events.append(hadise)
            # Uyğun node-u "vuruldu" (hit) kimi işarələ → ekranda qırmızı yanıb-sönər.
            self._mark_node_hit(source_kind, indi.strftime("%H:%M:%S"))
            return hadise

    def add_alert(self, alert):
        """Hazır bir təhlükə siqnalını siyahıya əlavə edir."""
        with self._lock:
            alert["id"] = self._next_id()
            self.alerts.append(alert)
            return alert

    def _mark_node_hit(self, kind, vaxt):
        """Verilmiş növdəki tələ node-unu 'vuruldu' kimi işarələ."""
        if not kind:
            return
        for n in self.nodes:
            if n["kind"] == kind:
                n["status"] = "hit"
                n["last_hit"] = vaxt

    def get_state(self):
        """Frontend hər 1 saniyədə bunu çağırır. Bütün cari vəziyyəti verir."""
        with self._lock:
            yuksek = len([a for a in self.alerts if a.get("risk") == "yüksək"])
            return {
                # Siqnallar: ən yenisi yuxarıda olsun deyə tərsinə çeviririk.
                "alerts": list(reversed(self.alerts)),
                "nodes": self.nodes,
                "stats": {
                    "total_events": len(self.events),
                    "total_alerts": len(self.alerts),
                    "high_risk": yuksek,
                },
            }


# Bütün tətbiq boyu istifadə olunan TƏK store nüsxəsi.
store = Store()
