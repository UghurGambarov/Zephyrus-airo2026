// =====================================================================
// Zephyrus — LOG ÇEVİRİCİ (Feature 2)
// ---------------------------------------------------------------------
// İstifadəçinin yüklədiyi xam logları platformamızın "native" formatına
// çevirir: {timestamp, source_ip, device, action, status, istifadeci}.
// Sonra bu sətirlər ML mühərrikinə (backend) göndərilir.
//
// 3 ən yayğın korporativ log formatı dəstəklənir:
//   - Syslog (RFC 5424)         — Linux serverlər, firewall-lar, routerlər
//   - Windows Event (EVTX/JSON) — Active Directory, Windows endpoint-lər
//   - CEF / LEEF                — CheckPoint, Cisco, korporativ firewall-lar
//
// Çevirici AÇAR sahələri avtomatik xəritələyir (məs. "TargetUserName" və ya
// "src" → bizim "istifadeci" və "source_ip"). İstifadəçi köhnə datasını ƏL ilə
// yenidən yazmır.
// =====================================================================

// IP ünvanını mətndən çıxarmaq üçün köməkçi.
const IP_RE = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/;

// Vaxtı ISO formatına normallaşdırır; alınmasa, ardıcıl süni vaxt verir.
function normTs(ts, i, base) {
  if (ts) {
    let d;
    if (/^\d{13}$/.test(ts)) d = new Date(Number(ts));
    else if (/^\d{10}$/.test(ts)) d = new Date(Number(ts) * 1000);
    else d = new Date(ts);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date(base + i * 5000).toISOString();
}

// --------------------------- SYSLOG (RFC 5424) ---------------------------
function parseSyslog(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows = [];
  for (const line of lines) {
    // <PRI>VER TIMESTAMP HOST APP PROCID MSGID [SD] MSG
    const m = line.match(/^<(\d+)>(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/);
    const ts = m ? m[3] : null;
    const host = m ? m[4] : null;
    const app = m ? m[5] : null;
    const msgid = m ? m[7] : null;
    const low = line.toLowerCase();
    const ipM = line.match(/src_ip="?([\d.]+)"?/) || line.match(IP_RE);
    const status = /fail|denied|invalid|error|unauthor/.test(low) ? "FAILED" : "OK";
    const action = /scan|probe|nmap/.test(low)
      ? "PROBE"
      : /password|login|auth|ssh|logon/.test(low)
      ? "LOGIN"
      : msgid || "EVENT";
    const userM = line.match(/for (\w+)/) || line.match(/user[=:](\w+)/i);
    rows.push({
      timestamp: ts,
      source_ip: ipM ? ipM[1] : "-",
      device: host || app || "syslog-host",
      action,
      status,
      istifadeci: userM ? userM[1] : "",
    });
  }
  return rows;
}

// --------------------------- WINDOWS EVENT (JSON) ---------------------------
const WIN_EVENT = {
  4624: { a: "LOGIN", s: "OK" },        // uğurlu giriş
  4625: { a: "LOGIN", s: "FAILED" },    // uğursuz giriş
  4634: { a: "LOGOFF", s: "OK" },
  4648: { a: "LOGIN_EXPLICIT", s: "OK" },
  4672: { a: "PRIV_ASSIGN", s: "OK" },  // imtiyazlı giriş
  4720: { a: "USER_CREATE", s: "OK" },
  4688: { a: "PROCESS", s: "OK" },
  4768: { a: "KERBEROS_TGT", s: "OK" },
  5140: { a: "SHARE_ACCESS", s: "OK" },
};

function parseWindows(text) {
  let arr;
  try {
    const parsed = JSON.parse(text);
    arr = Array.isArray(parsed) ? parsed : parsed.Events || parsed.events || [parsed];
  } catch {
    // NDJSON (hər sətirdə bir JSON obyekt)
    arr = [];
    for (const l of text.split(/\r?\n/)) {
      if (!l.trim()) continue;
      try {
        arr.push(JSON.parse(l));
      } catch {
        /* sətri ötür */
      }
    }
  }
  const rows = [];
  for (const ev of arr) {
    const eid = ev.EventID ?? ev.Id ?? ev.event_id;
    const map = WIN_EVENT[eid] || { a: "EVENT", s: "OK" };
    const ip =
      ev.IpAddress || ev.SourceNetworkAddress || ev["Source Network Address"] || ev.src_ip || "-";
    rows.push({
      timestamp: ev.TimeCreated || ev.TimeGenerated || ev.timestamp,
      source_ip: ip,
      device: ev.Computer || ev.Hostname || ev.MachineName || "win-host",
      action: map.a,
      status: map.s,
      istifadeci: ev.TargetUserName || ev.SubjectUserName || ev.AccountName || "",
    });
  }
  return rows;
}

// --------------------------- CEF / LEEF ---------------------------
function parseCEF(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows = [];
  for (const line of lines) {
    let product, name = "", ext;
    if (/^CEF:/.test(line)) {
      const p = line.split("|");
      product = p[2] || "";
      name = p[5] || "";
      ext = p.slice(7).join("|");
    } else if (/^LEEF:/.test(line)) {
      const p = line.split("|");
      product = p[2] || "";
      ext = p.slice(5).join("|");
    } else {
      continue; // tanınmayan sətir
    }
    // Açar=dəyər cütlərini çıxar (dəyər boşluq saxlaya bilər).
    const kv = {};
    const extNorm = ext.replace(/\t/g, " ");
    const re = /(\w+)=(.*?)(?=\s+\w+=|$)/g;
    let mm;
    while ((mm = re.exec(extNorm))) kv[mm[1]] = mm[2].trim();

    const act = kv.act || kv.outcome || name;
    const low = `${act} ${name}`.toLowerCase();
    const status = /block|deny|fail|drop|reject/.test(low) ? "DENIED" : "OK";
    const action = /scan|probe/.test(low)
      ? "PROBE"
      : /login|auth|logon/.test(low)
      ? "LOGIN"
      : act || name || "EVENT";
    rows.push({
      timestamp: kv.rt || kv.start || null,
      source_ip: kv.src || kv.sourceAddress || kv.shost || "-",
      device: kv.dvchost || kv.dvc || product || "cef-device",
      action,
      status,
      istifadeci: kv.suser || kv.duser || "",
    });
  }
  return rows;
}

// Format → (parser, xəritələmə təsviri, nümunə data).
export const FORMATS = {
  syslog: {
    ad: "Syslog (RFC 5424)",
    izah: "Linux serverlər, firewall-lar və şəbəkə routerləri",
    parse: parseSyslog,
    mapping: [
      ["TIMESTAMP", "timestamp"],
      ["HOSTNAME / APP", "device"],
      ['src_ip / mesajdakı IP', "source_ip"],
      ["MSGID / mesaj", "action"],
      ["fail/denied açar sözləri", "status"],
    ],
  },
  windows: {
    ad: "Windows Event (EVTX/JSON)",
    izah: "Active Directory domain controller-lər və Windows endpoint-lər",
    parse: parseWindows,
    mapping: [
      ["TimeCreated", "timestamp"],
      ["Computer", "device"],
      ["IpAddress", "source_ip"],
      ["EventID", "action + status"],
      ["TargetUserName", "istifadeci"],
    ],
  },
  cef: {
    ad: "CEF / LEEF",
    izah: "CheckPoint, Cisco və korporativ firewall cihazları",
    parse: parseCEF,
    mapping: [
      ["rt / start", "timestamp"],
      ["dvc / Product", "device"],
      ["src", "source_ip"],
      ["act / Name", "action"],
      ["act/outcome → block/deny", "status"],
    ],
  },
};

// Əsas funksiya: formatı seç, mətni çevir, native sətirləri qaytar.
export function convert(format, text) {
  const f = FORMATS[format];
  if (!f) return { rows: [], xeta: "Naməlum format" };
  let rows;
  try {
    rows = f.parse(text) || [];
  } catch (e) {
    return { rows: [], xeta: "Çevirmə xətası: " + e.message };
  }
  // Vaxtları normallaşdır (ISO).
  const base = Date.now() - rows.length * 5000;
  rows = rows.map((r, i) => ({ ...r, timestamp: normTs(r.timestamp, i, base) }));
  return { rows, mapping: f.mapping };
}

// ---------------- NÜMUNƏ DATA (demo üçün — "Nümunə doldur" düyməsi) ----------------
export const SAMPLES = {
  syslog: `<34>1 2026-06-20T09:15:00Z fw-01 sshd 2103 ID47 [meta src_ip="45.142.120.50"] Failed password for admin from 45.142.120.50 port 51422 ssh2
<34>1 2026-06-20T09:15:04Z fw-01 sshd 2103 ID47 [meta src_ip="45.142.120.50"] Failed password for admin
<34>1 2026-06-20T09:15:08Z fw-01 sshd 2103 ID47 [meta src_ip="45.142.120.50"] Failed password for root
<34>1 2026-06-20T09:15:12Z fw-01 sshd 2103 ID47 [meta src_ip="45.142.120.50"] Failed password for admin
<34>1 2026-06-20T09:15:16Z fw-01 sshd 2103 ID47 [meta src_ip="45.142.120.50"] Failed password for admin
<34>1 2026-06-20T09:15:20Z fw-01 sshd 2103 ID47 [meta src_ip="45.142.120.50"] Failed password for administrator
<86>1 2026-06-20T11:02:00Z web-01 nginx 1010 ID20 [meta src_ip="10.0.0.12"] GET /status 200 OK
<86>1 2026-06-20T12:30:00Z web-01 nginx 1010 ID20 [meta src_ip="10.0.0.15"] GET /index 200 OK`,
  windows: `[
  {"EventID":4625,"TimeCreated":"2026-06-20T03:12:00","Computer":"DC01","TargetUserName":"administrator","IpAddress":"185.220.101.7","LogonType":3},
  {"EventID":4625,"TimeCreated":"2026-06-20T03:12:05","Computer":"DC01","TargetUserName":"administrator","IpAddress":"185.220.101.7","LogonType":3},
  {"EventID":4625,"TimeCreated":"2026-06-20T03:12:10","Computer":"DC01","TargetUserName":"admin","IpAddress":"185.220.101.7","LogonType":3},
  {"EventID":4625,"TimeCreated":"2026-06-20T03:12:14","Computer":"DC01","TargetUserName":"admin","IpAddress":"185.220.101.7","LogonType":3},
  {"EventID":4672,"TimeCreated":"2026-06-20T03:13:00","Computer":"DC01","TargetUserName":"admin","IpAddress":"185.220.101.7"},
  {"EventID":4624,"TimeCreated":"2026-06-20T08:00:00","Computer":"DC01","TargetUserName":"jsmith","IpAddress":"10.0.0.21","LogonType":2}
]`,
  cef: `CEF:0|CheckPoint|FW1|R81|100|Connection Blocked|7|rt=2026-06-20T02:14:03 src=45.142.120.50 dst=10.0.0.5 act=Block spt=51422 suser=admin
CEF:0|Cisco|ASA|9.8|200|Port Scan Detected|8|rt=2026-06-20T02:14:08 src=45.142.120.50 act=Scan
CEF:0|CheckPoint|FW1|R81|100|Connection Blocked|7|rt=2026-06-20T02:14:13 src=45.142.120.50 dst=10.0.0.6 act=Block suser=root
CEF:0|CheckPoint|FW1|R81|100|Connection Blocked|7|rt=2026-06-20T02:14:18 src=45.142.120.50 dst=10.0.0.7 act=Block
CEF:0|Cisco|ASA|9.8|300|VPN Login|3|rt=2026-06-20T09:00:00 src=10.0.0.24 act=Allow suser=akhan`,
};
