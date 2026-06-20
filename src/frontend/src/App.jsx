// =====================================================================
// Zephyrus — "City Trap" idarə paneli (React)
// Faza 0: Yalnız backend ilə əlaqənin işlədiyini yoxlayan sadə səhifə.
// Sonrakı fazalarda burada şəhər xəritəsi, canlı siqnallar və
// insident hesabatı görünəcək.
// =====================================================================

import { useEffect, useState } from "react";
import "./App.css";

// Backend serverin ünvanı (lokal). Faza 0-da yalnız əlaqəni yoxlayırıq.
const BACKEND = "http://127.0.0.1:8000";

function App() {
  // "status" backend-dən gələn mesajı saxlayır.
  const [status, setStatus] = useState("yoxlanılır...");
  const [error, setError] = useState(null);

  // Komponent ekrana gələn kimi backend-ə bir dəfə müraciət edirik.
  useEffect(() => {
    fetch(`${BACKEND}/`)
      .then((r) => r.json())
      .then((data) => setStatus(data.mesaj))
      .catch(() => setError("Backend-ə qoşulmaq alınmadı (server işləyirmi?)"));
  }, []);

  return (
    <div className="faza0">
      <h1>🛡️ Zephyrus — City Trap</h1>
      <p className="alt">
        Ağıllı Şəhər üçün Sİ əsaslı Kibertəhlükə Aşkarlama Sistemi
      </p>

      <div className="card">
        <h2>Faza 0 — Quraşdırma</h2>
        {error ? (
          <p className="err">❌ {error}</p>
        ) : (
          <p className="ok">✅ Backend cavabı: {status}</p>
        )}
      </div>

      <p className="qeyd">
        Bu, ilkin quraşdırma ekranıdır. Növbəti fazalarda tam SOC paneli
        (şəhər şəbəkəsi, canlı siqnallar, insident hesabatı) əlavə olunacaq.
      </p>
    </div>
  );
}

export default App;
