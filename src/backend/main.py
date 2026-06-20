# =====================================================================
# Zephyrus — "City Trap" Ağıllı Şəhər Təhlükə Aşkarlama Mühərriki
# Backend giriş nöqtəsi (FastAPI)
# ---------------------------------------------------------------------
# Bu fayl serverin ƏSAS giriş nöqtəsidir. O, hissələri bir yerə yığır:
#   - store.py  → bütün vəziyyət (hadisələr, siqnallar, node-lar)
#   - decoys.py → 4 tələ (decoy) endpoint-i
# Növbəti fazalarda bura aşkarlama mühərriki, şəhər axını və hesabat gələcək.
# =====================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from store import store
from decoys import router as decoy_router

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

# 4 tələ endpoint-ini tətbiqə qoşuruq (/decoy/...).
app.include_router(decoy_router)


# Ən sadə yoxlama endpoint-i: server canlıdırmı?
@app.get("/")
def root():
    return {
        "ad": "Zephyrus City Trap",
        "status": "işləyir",
        "mesaj": "Backend uğurla işə düşdü. Faza 2: Sİ aşkarlama mühərriki aktivdir.",
    }


# Vəziyyət endpoint-i: frontend hər 1 saniyədə bunu soruşacaq.
# İndi real data qaytarır: siqnallar, node-lar və statistika.
@app.get("/api/state")
def get_state():
    return store.get_state()


# Demo-nu təmizləmək üçün: bütün hadisə və siqnalları sıfırlayır.
@app.post("/api/reset")
def reset_state():
    store.reset()
    return {"status": "təmizləndi", "mesaj": "Bütün hadisə və siqnallar sıfırlandı."}
