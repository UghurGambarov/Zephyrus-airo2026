# =====================================================================
# Zephyrus — MEMARLIQ DİAQRAMINI ÇƏKƏN SKRIPT
# ---------------------------------------------------------------------
# Bu skript "architecture-diagram.png" faylını YARADIR (script-drawn diagram).
# Axın: DATA MƏNBƏLƏRİ → 3 Sİ QATI → SİQNAL/HESABAT → DASHBOARD,
# plus real-dünya tətbiq (deployment) görünüşü.
#
# QEYD: matplotlib YALNIZ bu diaqramı yenidən yaratmaq üçün lazımdır
# (sənəd alətidir, sistemin işləməsi üçün lazım deyil). İşə salmaq:
#     .venv\Scripts\python.exe docs\gen_architecture_diagram.py
# =====================================================================

import os
import matplotlib

matplotlib.use("Agg")  # ekransız (server) rejimdə PNG yaratmaq üçün
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

# --- Rəng paleti (SOC konsolu teması ilə uyğun) ---
BG = "#0b1019"
PANEL = "#131d2e"
CYAN = "#38e0d8"
GREEN = "#3ddc84"
AMBER = "#ffb340"
RED = "#ff4d5e"
INK = "#e6edf7"
DIM = "#93a3bd"
LINE = "#2b3c5c"


def qutu(ax, x, y, w, h, basliq, alt="", reng=CYAN):
    """Bir mərhələ qutusu çəkir (başlıq + alt mətn)."""
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.08",
        linewidth=2, edgecolor=reng, facecolor=PANEL, zorder=2,
    )
    ax.add_patch(box)
    ax.text(x + w / 2, y + h * 0.62, basliq, ha="center", va="center",
            color=INK, fontsize=11, fontweight="bold", zorder=3)
    if alt:
        ax.text(x + w / 2, y + h * 0.28, alt, ha="center", va="center",
                color=DIM, fontsize=8.5, zorder=3)


def ox(ax, x1, y1, x2, y2, reng=CYAN):
    """İki qutu arasında ox (axın istiqaməti) çəkir."""
    ax.add_patch(FancyArrowPatch(
        (x1, y1), (x2, y2),
        arrowstyle="-|>", mutation_scale=18,
        linewidth=2, color=reng, zorder=1,
    ))


fig, ax = plt.subplots(figsize=(14, 8.2))
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 14)
ax.set_ylim(0, 8.2)
ax.axis("off")

# Başlıq
ax.text(7, 7.8, "ZEPHYRUS · CITY TRAP — Aşkarlama Mühərrikinin Memarlığı",
        ha="center", color=CYAN, fontsize=15, fontweight="bold")
ax.text(7, 7.42, "Data mənbələri → 3 Sİ qatı → Siqnal/Hesabat → SOC Dashboard",
        ha="center", color=DIM, fontsize=10)

# --- 1) DATA MƏNBƏLƏRİ (sol sütun) ---
ax.text(1.5, 6.7, "DATA MƏNBƏLƏRİ", ha="center", color=AMBER, fontsize=10, fontweight="bold")
qutu(ax, 0.3, 5.4, 2.4, 0.95, "4 Tələ (Decoy)", "svetofor · portal · canary · kamera", RED)
qutu(ax, 0.3, 4.2, 2.4, 0.95, "Şəhər Hadisə Axını", "sample-data.csv loglar", AMBER)
qutu(ax, 0.3, 3.0, 2.4, 0.95, "Hücum Simulyatoru", "attacker.py (öz skriptimiz)", AMBER)

# --- 2) 3 Sİ QATI (mərkəz) ---
ax.text(6.4, 6.7, "AŞKARLAMA MÜHƏRRİKİ — 3 Sİ QATI", ha="center", color=CYAN, fontsize=10, fontweight="bold")
qutu(ax, 4.3, 5.4, 4.2, 0.95, "QAT 1 — ML Anomaliya", "IsolationForest · anomaliya balı 0–100", CYAN)
qutu(ax, 4.3, 4.2, 4.2, 0.95, "QAT 2 — Təsnifat + Risk", "hibrid ML+qayda · MITRE ATT&CK · aşağı/orta/yüksək", CYAN)
qutu(ax, 4.3, 3.0, 4.2, 0.95, "QAT 3 — Hesabat + İzah", "Azərbaycanca hesabat · opsional LLM (Claude)", CYAN)

# --- 3) NƏTİCƏ (sağ sütun) ---
ax.text(11.7, 6.7, "NƏTİCƏ", ha="center", color=GREEN, fontsize=10, fontweight="bold")
qutu(ax, 10.3, 5.4, 3.2, 0.95, "Admin Siqnalı", "real vaxt xəbərdarlıq (simulyasiya)", GREEN)
qutu(ax, 10.3, 4.2, 3.2, 0.95, "İnsident Hesabatı", "risk · MITRE · niyə · tövsiyə", GREEN)
qutu(ax, 10.3, 3.0, 3.2, 0.95, "SOC Dashboard", "3 zona · 1 san polling", GREEN)

# --- Oxlar: mənbə → mühərrik → nəticə ---
for y in (5.87, 4.67, 3.47):
    ox(ax, 2.7, y, 4.3, 5.87 if y > 5 else (4.67 if y > 4 else 3.47))
ox(ax, 2.7, 5.87, 4.3, 5.87)
ox(ax, 2.7, 4.67, 4.3, 4.67)
ox(ax, 2.7, 3.47, 4.3, 4.67)
ox(ax, 8.5, 5.87, 10.3, 5.87)
ox(ax, 8.5, 4.67, 10.3, 4.67)
ox(ax, 8.5, 3.47, 10.3, 3.47)
# qatlar arası daxili axın
ox(ax, 6.4, 5.4, 6.4, 5.15, DIM)
ox(ax, 6.4, 4.2, 6.4, 3.95, DIM)

# --- REAL DÜNYA TƏTBİQİ (aşağı zolaq) ---
band = FancyBboxPatch((0.3, 0.5), 13.2, 1.9,
                      boxstyle="round,pad=0.02,rounding_size=0.06",
                      linewidth=1.5, edgecolor=LINE, facecolor="#0e1623", zorder=0)
ax.add_patch(band)
ax.text(7, 2.15, "REAL DÜNYADA MİQYASLANMA", ha="center", color=AMBER,
        fontsize=10, fontweight="bold")
ax.text(7, 1.35,
        "Real cihaza toxunmuruq → yanına yüngül TƏLƏ + passiv log AGENT-i qoyuruq.\n"
        "Sinif əsaslı şablonlar (svetofor/kamera/portal) · Mərkəzi konsol + yüngül edge · Çox-saytlılıq (Ağalı ↔ Bakı).\n"
        "Yeni cihaz növü = yeni tələ şablonu. Biz cihazı yox, hücumçunun KƏŞFİYYAT davranışını aşkarlayırıq.",
        ha="center", va="center", color=DIM, fontsize=9, linespacing=1.5)

out = os.path.join(os.path.dirname(__file__), "architecture-diagram.png")
plt.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
print("Yaradıldı:", out)
