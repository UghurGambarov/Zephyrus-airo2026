// Narrative for the "Simulation Control Center" modal. This is a purely visual
// story; real ML scores arrive from the backend engine in the background.

export const STORY = [
  {
    name: "Faza 1 — Kəşfiyyat (Reconnaissance)",
    ico: "🔍",
    lines: [
      "🔍 Hədəf təyin edildi: 192.168.10.45 (Maliyyə Serveri)",
      "⚡ Port skanı başladıldı...",
      "✓ Açıq portlar tapıldı: 22 (SSH), 3389 (RDP)",
    ],
  },
  {
    name: "Faza 2 — Brute Force",
    ico: "🔑",
    lines: [
      "🔑 SSH üçün parol lüğəti ilə hücum (credential stuffing)...",
      "❌ Cəhd 1/10: Giriş rədd edildi (yanlış etimadnamə)",
      "❌ Cəhd 4/10: Giriş rədd edildi",
      "❌ Cəhd 9/10: Giriş rədd edildi",
      "🔓 Cəhd 10/10: UĞURLU! Parol qırıldı [admin:P@ssword123]",
    ],
  },
  {
    name: "Faza 3 — Yayılma və Data Sızması",
    ico: "🦹",
    lines: [
      "🦹 Giriş əldə olundu. Lokal imtiyaz yüksəldilməsi uğurlu",
      "📂 Verilənlər bazası ehtiyatları üçün qovluqlar skan edilir...",
      "📡 Etimadnamələr çıxarılır, sızma tunelləri hazırlanır",
      "🛡️ TƏLƏ İŞƏ DÜŞDÜ → hərəkət aşkarlandı və bloklandı",
    ],
  },
];
