# Zephyrus City Trap — Project Overview

**AI-powered cyber-threat detection for smart cities, built on a deception grid.**

*A business and capability overview for government officials, investors,
customers, and procurement teams.*

---

## Executive summary

Modern cities increasingly run on connected devices — traffic controllers,
surveillance cameras, ATMs, water and power sensors, and industrial control
systems. These devices deliver enormous public value, but many of them run on
old protocols, default passwords, and weak network isolation. They are an
attractive, poorly defended target. Meanwhile, the human analysts who are
supposed to watch them cannot possibly read the millions of log lines these
devices generate every day. As a result, attacks are detected late — often only
after damage is done.

**Zephyrus City Trap** solves this in two complementary ways:

1. **A deception grid.** We place realistic *decoys* — fake traffic
   controllers, a fake city portal, a fake ATM, a fake camera, and a "canary"
   credentials file — alongside the real infrastructure. No legitimate user
   ever has a reason to touch a decoy, so **any** interaction with one is an
   almost-certain attack. This produces high-confidence alerts with virtually
   zero false alarms.

2. **Layered artificial intelligence.** Every event — whether from a decoy or
   from the normal flow of city activity — is analyzed by a machine-learning
   engine that detects anomalies, classifies the threat, scores its risk, maps
   it to the international MITRE ATT&CK framework, and produces a clear,
   analyst-ready incident report with recommended actions.

The result is a system that **cuts an analyst's workload by roughly ten times**,
surfaces real threats early, and explains itself in plain language — while
keeping a human in control of every final decision.

> **One-line pitch:** *Zephyrus City Trap turns a city's silent flood of device
> logs into a short, ranked list of real threats — and catches attackers the
> moment they touch a trap.*

---

## Table of contents

- [The problem](#the-problem)
- [Why it matters](#why-it-matters)
- [Our solution](#our-solution)
- [How it works](#how-it-works)
- [Key features and capabilities](#key-features-and-capabilities)
- [Technical architecture in simple terms](#technical-architecture-in-simple-terms)
- [Real-world use cases](#real-world-use-cases)
- [Benefits by stakeholder](#benefits-by-stakeholder)
- [Competitive advantages](#competitive-advantages)
- [Security, reliability, and operations](#security-reliability-and-operations)
- [Expected impact and value proposition](#expected-impact-and-value-proposition)
- [Roadmap and scalability](#roadmap-and-scalability)
- [Executive briefing snippets](#executive-briefing-snippets)

---

## The problem

Smart-city infrastructure has quietly become **critical national
infrastructure**, but its security has not kept pace.

| Challenge | Description |
| --------- | ----------- |
| **Legacy and exposed devices** | Traffic lights, sensors, ATMs, and SCADA/PLC units often use outdated protocols, default credentials, and flat networks. |
| **Overwhelming log volume** | A mid-sized city generates millions of device log lines daily — far beyond what human analysts can review. |
| **Alert fatigue** | Traditional tools produce huge numbers of low-quality alerts; real threats get buried in noise. |
| **Late detection** | Attacks are frequently discovered only after service disruption, financial loss, or data theft. |
| **Scarce expertise** | Skilled security analysts are expensive and in short supply, especially for public-sector budgets. |

---

## Why it matters

An attack on city infrastructure is not an abstract IT problem — it has direct
public consequences:

- **Public safety:** manipulated traffic signals or disabled cameras endanger
  citizens.
- **Financial loss:** ATM "jackpotting" and payment-network intrusions cause
  direct monetary damage.
- **Essential services:** tampering with water, power, or SCADA systems can
  disrupt entire neighborhoods.
- **Public trust:** visible failures erode confidence in digital government
  initiatives.

Detecting these attacks **early and reliably** is therefore a matter of public
safety, financial stewardship, and institutional credibility.

---

## Our solution

Zephyrus City Trap combines **deception** and **AI** into a single defensive
platform with a clear operational console.

```
        ┌──────────────────────────────────────────────────────────┐
        │                   ZEPHYRUS CITY TRAP                      │
        │                                                          │
        │   ┌───────────────┐         ┌────────────────────────┐   │
        │   │ DECEPTION GRID │  ───►   │   LAYERED AI ENGINE     │   │
        │   │  (5 decoys)    │         │  detect · classify ·    │   │
        │   └───────────────┘         │  score · explain        │   │
        │   ┌───────────────┐  ───►    │                        │   │
        │   │  CITY ACTIVITY │         └───────────┬────────────┘   │
        │   │  (real logs)   │                     │                │
        │   └───────────────┘                     ▼                │
        │                          ┌────────────────────────────┐  │
        │                          │   SOC CONSOLE (live map,    │  │
        │                          │   alerts, incident reports) │  │
        │                          └────────────────────────────┘  │
        └──────────────────────────────────────────────────────────┘
```

**The core insight:** a legitimate user never touches a decoy. So the moment an
attacker does, we know — instantly and with near-certainty. The AI engine then
adds depth: it scores every event, finds anomalies even in normal traffic, and
writes the incident report a human would otherwise spend an hour preparing.

---

## How it works

The system follows a simple, transparent flow:

1. **Observe.** Decoys and real device logs feed a continuous stream of events.
2. **Detect.** A machine-learning model learns what "normal" city traffic looks
   like and flags anything unusual — including attacks it has never seen before.
3. **Classify and score.** Each event receives a threat category, a risk level
   (low / medium / high), an internationally recognized MITRE ATT&CK label, and
   an anomaly score from 0 to 100.
4. **Explain.** The system writes a plain-language incident report: what
   happened, why it is risky, and the recommended response steps.
5. **Decide.** A human analyst reviews the prioritized alerts and makes the
   final call. *The AI prepares; the human approves.*

```
  Decoys ─┐
          ├─►  Detect (ML)  ─►  Classify & score  ─►  Explain (report)  ─►  Human decision
City logs ┘
```

---

## Key features and capabilities

| Capability | What it delivers |
| ---------- | ---------------- |
| **Deception grid (5 decoys)** | Fake traffic controller, city portal, ATM, camera, and a canary credentials file — each hit is a near-zero-false-positive alert. |
| **Anomaly detection** | Learns normal behaviour and catches both known and novel attacks. |
| **Threat classification** | Categorizes each event and maps it to MITRE ATT&CK, the global standard for describing attacker techniques. |
| **Risk scoring** | Every event gets a clear low/medium/high rating and a 0–100 score, so analysts focus on what matters. |
| **Explainable AI** | Plain-language reasons for every alert — no black box. |
| **Automated incident reports** | Ready-to-act reports with recommended response steps, generated instantly. |
| **Live city map** | An interactive map shows every device's status in real time (safe / suspicious / under attack). |
| **Attack simulation** | A one-click, fully self-contained simulation for training and demonstrations. |
| **Universal log import** | Imports real corporate logs (Syslog, Windows Event, CEF/LEEF) for forensic analysis. |
| **Optional AI narrative** | Can produce a richer natural-language report using a large language model when desired. |

---

## Technical architecture in simple terms

The platform has two main parts working together:

- **The console (what people see).** A clean security-operations dashboard with
  three panels: a live city map, a stream of prioritized alerts, and a detailed
  incident report for the selected alert.

- **The engine (what does the thinking).** A service that ingests events, runs
  the AI detection pipeline, and serves results to the console.

```
   People ──►  Console (dashboard)  ──►  Engine (AI detection)  ──►  Decision
                                              │
                                      ┌───────┴────────┐
                                      │  Deception grid │
                                      │  + log analysis │
                                      └────────────────┘
```

**Designed for trust and reliability:**

- The AI runs **locally** — it does not depend on an internet connection to
  function, so it keeps working in restricted or air-gapped environments.
- The detection logic is **explainable**, not a black box — every score comes
  with a reason.
- A **human remains in the loop** for all final decisions.

*(For the full developer-level architecture, see
[`docs/architecture.md`](docs/architecture.md) and
[`README.md`](README.md).)*

---

## Real-world use cases

| Scenario | How Zephyrus helps |
| -------- | ------------------ |
| **Smart-traffic protection** | Detects unauthorized access to traffic/SCADA controllers before signals can be manipulated. |
| **ATM and payment security** | Catches "jackpotting" and malicious-firmware attempts via an ATM decoy, and flags suspicious financial-network activity. |
| **Critical utilities (water/power)** | Monitors SCADA/PLC access patterns and raises early alerts on off-hours or anomalous control activity. |
| **Surveillance integrity** | Identifies attempts to hijack or disable camera streams. |
| **Forensic investigation** | Imports historical Syslog/Windows/CEF logs to reconstruct and score a past incident. |
| **Security training & exercises** | The built-in attack simulation provides a safe, repeatable training environment for SOC teams. |

---

## Benefits by stakeholder

### For governments and city authorities
- Early, high-confidence detection of attacks on critical infrastructure.
- Dramatically reduced analyst workload — more coverage with the same staff.
- Works offline and on-premises, suitable for sovereign and sensitive
  deployments.
- Standards-aligned (MITRE ATT&CK) reporting for accountability and audits.

### For organizations and operators
- Fewer false alarms and less alert fatigue.
- Faster incident response with ready-made, actionable reports.
- Easy integration of existing logs from common enterprise systems.

### For end users and citizens
- More reliable, safer public services.
- Reduced risk of service disruption and financial fraud.
- Greater confidence in digital city initiatives.

---

## Competitive advantages

| Advantage | Why it sets us apart |
| --------- | -------------------- |
| **Deception-first** | Decoys deliver near-zero-false-positive alerts — a fundamentally higher signal quality than log-analysis-only tools. |
| **Explainable AI** | Every alert carries a human-readable justification, supporting trust, audits, and analyst confidence. |
| **Offline-capable** | The core engine needs no internet, enabling secure, sovereign, and air-gapped deployments. |
| **Standards-aligned** | Native MITRE ATT&CK mapping fits established security operations and reporting practices. |
| **Human-in-the-loop by design** | Augments analysts rather than replacing them — a responsible, defensible model for public-sector use. |
| **Localized** | A fully localized (Azerbaijani) operator experience, ready for regional deployment. |
| **Lightweight & extensible** | A clean, modular architecture that is inexpensive to run and straightforward to extend. |

---

## Security, reliability, and operations

- **Defensive by design.** The platform never attacks real systems. Its built-in
  "attacker" is a self-contained simulation that touches only the local
  environment. Decoys hold **synthetic data only** — no real citizen
  information.
- **Data protection.** Configuration and secrets are kept out of the codebase
  and supplied through the environment. Network access policies are
  configurable for production.
- **Reliability.** The detection engine is deterministic and runs locally;
  optional AI-narrative features degrade gracefully (the system remains fully
  functional without them).
- **Operational fit.** A standards-based web architecture that deploys behind
  standard infrastructure (reverse proxy, static hosting) and integrates with
  existing log sources.
- **Governance.** Human approval is required for escalation and closure,
  supporting clear accountability.

> **Note on current maturity:** the platform today is a strong, working
> foundation (MVP). State is held in memory and resets on restart; production
> hardening items (shared persistence, authentication, real-time push) are
> identified on the roadmap below.

---

## Expected impact and value proposition

| Dimension | Expected impact |
| --------- | --------------- |
| **Detection speed** | From after-the-fact discovery to **near-real-time** alerts. |
| **Analyst efficiency** | Approximately **10× reduction** in manual log-review effort. |
| **Alert quality** | Decoy hits provide near-zero-false-positive, high-priority signals. |
| **Financial protection** | Earlier detection of ATM/payment attacks reduces direct losses. |
| **Public safety** | Faster response to infrastructure threats protects citizens and services. |
| **Cost efficiency** | Lightweight, offline-capable design lowers operating cost and barriers to adoption. |

**Value proposition in one sentence:** *Zephyrus City Trap delivers
high-confidence, explainable threat detection for smart cities at a fraction of
the cost and complexity of traditional security operations — protecting public
infrastructure, budgets, and trust.*

---

## Roadmap and scalability

The platform is built to grow from a single-site deployment to a national,
multi-site program.

| Phase | Focus | Outcome |
| ----- | ----- | ------- |
| **Now (MVP)** | Core detection, deception grid, console | Working, demonstrable platform |
| **Hardening** | Persistent storage, authentication & roles | Production reliability and access control |
| **Real-time** | Live push (WebSocket) instead of polling | Instant updates at scale |
| **Integration** | Device log agents, more log formats (Zeek, Suricata, CloudTrail) | Broader coverage of real environments |
| **Intelligence** | Per-site model tuning from each site's own history | Higher accuracy, fewer false alarms |
| **Scale** | Multi-tenant central console | Manage many cities/sites from one place |
| **Ecosystem** | More decoy templates (PLC, IoT gateway, smart meter) | Wider attack-surface coverage |

**Scalability principle:** the system is modular — detection, deception, log
ingestion, and storage are separate components. Storage is the single point that
swaps from in-memory to a database to support horizontal scaling, without
changing the detection logic.

---

## Executive briefing snippets

*Ready-to-use text for presentations, procurement discussions, and funding
proposals.*

**For a funding proposal:**
> Zephyrus City Trap addresses an urgent and growing gap: the security of
> smart-city infrastructure that has become critical to public safety and
> services. By combining a deception grid with explainable, offline-capable AI,
> it detects attacks early and with near-zero false positives, while reducing
> analyst workload roughly tenfold. The platform is modular and built to scale
> from a single site to a national, multi-city program.

**For a procurement discussion:**
> The platform aligns with international security standards (MITRE ATT&CK),
> operates on-premises without internet dependency for sovereign deployments,
> keeps a human in control of every decision, and provides standards-based,
> auditable incident reporting. Configuration and secrets are externalized, and
> the architecture deploys behind standard enterprise infrastructure.

**For a stakeholder meeting:**
> Think of Zephyrus as both a tripwire and an analyst. The tripwire — our decoy
> network — catches attackers the instant they touch a fake device, with almost
> no false alarms. The analyst — our AI engine — reads every log line a human
> never could, ranks the real threats, and writes the incident report. People
> stay in charge; the machine does the heavy lifting.

**For an investor one-pager:**
> Critical infrastructure is going digital faster than it is being secured.
> Zephyrus City Trap turns that risk into an opportunity with a deception-first,
> explainable-AI platform that is cheaper to run, easier to trust, and built to
> scale across cities and sectors.
