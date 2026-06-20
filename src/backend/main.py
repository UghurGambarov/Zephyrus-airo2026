# =====================================================================
# Zephyrus — "City Trap" Ağıllı Şəhər Təhlükə Aşkarlama Mühərriki
# Backend giriş nöqtəsi (FastAPI)
# ---------------------------------------------------------------------
# Bu fayl serverin ƏSAS giriş nöqtəsidir. Faza 0-da yalnız serverin
# işlədiyini yoxlamaq üçün sadə cavablar qaytarır. Növbəti fazalarda
# bura decoy (tələ) endpoint-ləri, aşkarlama mühərriki və hesabat
# əlavə olunacaq.
# =====================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# FastAPI tətbiqi yaradılır. "title" Swagger sənədlərində görünür.
app = FastAPI(title="Zephyrus City Trap — Aşkarlama Mühərriki")

# ---------------------------------------------------------------------
# CORS icazəsi: frontend (Vite, 5173 portunda) backend-ə (8000 portu)
# müraciət edə bilsin deyə bütün mənbələrə icazə veririk.
# Bu, yalnız lokal demo üçündür — real məhsulda məhdudlaşdırılmalıdır.
# ---------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Ən sadə yoxlama endpoint-i: server canlıdırmı?
@app.get("/")
def root():
    return {
        "ad": "Zephyrus City Trap",
        "status": "işləyir",
        "mesaj": "Backend uğurla işə düşdü. Faza 0 tamamlandı.",
    }


# Vəziyyət endpoint-i: frontend hər 1 saniyədə bunu soruşacaq.
# Hələlik boş siyahılar qaytarır; sonrakı fazalarda real data gələcək.
@app.get("/api/state")
def get_state():
    return {
        "alerts": [],   # aşkarlanmış təhlükə siqnalları (sonra dolacaq)
        "nodes": [],    # şəhər şəbəkəsindəki node-lar (sonra dolacaq)
        "stats": {"total_events": 0, "high_risk": 0},
    }
