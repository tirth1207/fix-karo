# FUTURE_TASKS.md
## Home Services Platform – Priority Execution Roadmap

This document defines the **critical tasks that must be completed first** to move the system from
**“architecture-complete MVP” → “production-ready, abuse-resistant product.”**

The order is intentional.  
DO NOT skip levels.

---

## 🔴 PHASE 0 – ABSOLUTE BLOCKERS (DO FIRST)

These items block real users, real money, and real safety.

### 0.1 Real OTP Delivery (CRITICAL) (Not Applicable Currently)
- [ ] Integrate SMS provider (Twilio / MSG91 / AWS SNS)
- [ ] Remove OTP from API responses
- [ ] Add resend OTP with cooldown (30s / max 3 tries)
- [ ] Add OTP expiry handling UI
- [ ] Log OTP attempts for abuse detection

### 0.2 Customer OTP at Job Start & Completion (Not Applicable Currently)
- [ ] UI for customer to receive OTP
- [ ] UI for technician to enter OTP
- [ ] Retry + expiry handling
- [ ] Fallback flow if customer unreachable (admin-assisted)
- [ ] Clear error messaging (wrong / expired OTP)

### 0.3 Camera-Only Photo Enforcement
- [ ] Force live camera capture (disable gallery upload)
- [ ] Strip EXIF + attach server-side timestamp
- [ ] Block upload if camera permission denied
- [ ] Show technician preview + retake option

---

## 🟠 PHASE 1 – TRUST & FRAUD PREVENTION UX

Fraud logic already exists. This phase **prevents fraud earlier**, not just detects it.

### 1.1 Technician Job Timer & Warnings
- [ ] Show job timer once work starts
- [ ] Warn if completion attempted too early
- [ ] Display minimum expected duration
- [ ] Soft block → hard block (configurable)

### 1.2 Technician Arrival Confirmation
- [ ] Customer “Confirm Arrival” button
- [ ] Start official job timer only after confirmation
- [ ] Auto-escalation if customer does not confirm

### 1.3 GPS Trust UX
- [ ] Explicit GPS permission prompt
- [ ] Show detected address before booking
- [ ] Warn if GPS accuracy is low
- [ ] Block booking with stale coordinates

---

## 🟡 PHASE 2 – PAYMENTS & MONEY SAFETY

Money without clarity creates disputes.

### 2.1 Escrow Confirmation Flow
- [ ] Customer confirmation screen after job
- [ ] “Release Payment” explanation
- [ ] Auto-release countdown display
- [ ] Dispute button visibility window

### 2.2 Cash Payment Logging
- [ ] Technician declares cash received
- [ ] Customer confirms cash payment
- [ ] Auto-disable warranty on confirmation
- [ ] Offline payment abuse warnings

### 2.3 Wallet & Loyalty (Foundational)
- [ ] Wallet schema (balance, holds, rewards)
- [ ] Reward points calculation rules
- [ ] Admin adjustment capability
- [ ] Display wallet history to user

---

## 🟢 PHASE 3 – ADMIN & OPS POWER TOOLS

Without ops speed, fraud wins by volume.

### 3.1 Ops Playbooks (In-App)
- [ ] Guided flows for:
  - Customer unhappy
  - Technician late
  - Suspected fraud
  - Payment dispute
- [ ] Recommended actions per scenario
- [ ] One-click actions (refund, suspend, reassign)

### 3.2 Feature Toggle Admin UI
- [ ] Enable/disable features per city
- [ ] Reason logging for toggle changes
- [ ] Read-only view for ops staff

### 3.3 City Health Dashboard
- [ ] SLA metrics per city
- [ ] Complaint & fraud rate
- [ ] Revenue & supply-demand gap
- [ ] Technician availability heatmap

### 3.4 SOS System
- [ ] SOS button (customer + technician)
- [ ] Admin alert routing
- [ ] Emergency contact notification
- [ ] Audit logging of SOS events

---

## 🔵 PHASE 4 – CONVERSION & LOCK-IN (AFTER STABILITY)

Only do this after fraud & payments are solid.

### 4.1 Smart Booking UX
- [ ] Photo-first booking
- [ ] “Fix My Problem” free-text input
- [ ] Auto-suggest service & price
- [ ] Smart time slot ranking

### 4.2 Rebooking & Preferences
- [ ] One-tap repeat booking
- [ ] Preferred technician default
- [ ] Saved address & payment method
- [ ] Offline leakage warnings

### 4.3 Assisted Booking
- [ ] “Book for Me” option
- [ ] Ops-assisted booking UI
- [ ] Photo + issue intake for ops

---

## 🟣 PHASE 5 – GROWTH & MONETIZATION (POST-MVP)

Do NOT start before Phase 0–3 are complete.

- [ ] Technician subscription plans
- [ ] Dynamic commission engine
- [ ] Care plans (₹99–₹299)
- [ ] Service bundles & seasonal packs
- [ ] Society / builder dashboards
- [ ] White-label booking pages
- [ ] Tool & spare marketplace
- [ ] Technician income forecast
- [ ] Downtime optimizer

---

## ⚠️ NON-TECH MUST-HAVES (PARALLEL TRACK)

These are mandatory before public launch.

- [ ] Technician agreement (legal)
- [ ] Customer terms & warranty rules
- [ ] Privacy policy
- [ ] Refund & cancellation policy
- [ ] Internal ops ownership definitions
- [ ] Escalation responsibility matrix

---

## ✅ DEFINITION OF “READY TO LAUNCH”

The platform is launch-ready ONLY when:
- Phase 0, 1, and 2 are fully complete
- Real OTP + camera enforcement is live
- Escrow + disputes work end-to-end
- Admin can resolve issues without engineers

Anything less = controlled beta, not launch.

---
