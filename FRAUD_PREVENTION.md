# How Fraud is Stopped

## Multi-Layer Defense System

### 1. Database-Level Enforcement (Cannot Be Bypassed)

#### Booking State Machine
- **What**: Strict finite state machine for booking lifecycle
- **How**: PostgreSQL `BEFORE UPDATE` trigger validates all transitions
- **Protection**: Prevents status manipulation, ensures proper workflow
- **Example**: Cannot jump from "pending" to "completed" - must follow: pending → pending_payment → confirmed → technician_en_route → in_progress → awaiting_customer_confirmation → completed

#### Job Completion Requirements
- **What**: Cannot mark job complete without proof
- **How**: Database trigger validates before allowing status = 'completed'
- **Requirements**:
  - ≥1 job photo with valid GPS coordinates
  - GPS within allowed radius (default 100m)
  - Photo timestamps between job start and completion
- **Protection**: Prevents fake completions without being on-site

### 2. Automatic Fraud Detection (Real-Time)

#### Duplicate Photo Detection
- **Trigger**: `AFTER INSERT` on `job_photos`
- **Check**: SHA-256 hash comparison across all photos by technician
- **Action**: 
  - Creates HIGH severity fraud alert
  - Updates fraud metrics
  - Flags all bookings using the same photo
- **Catches**: Technicians reusing photos from previous jobs

#### Rapid Completion Detection
- **Trigger**: `AFTER UPDATE` on `bookings` (status → completed)
- **Check**: Actual duration vs estimated duration
- **Threshold**: <30% of expected time (minimum 15 minutes)
- **Severity**:
  - CRITICAL if <10 minutes
  - HIGH if <20 minutes
  - MEDIUM otherwise
- **Catches**: "Drive-by" fake completions

#### GPS Location Mismatch
- **Trigger**: `AFTER INSERT` on `job_photos`
- **Check**: Calculate distance from service location
- **Threshold**: >2x allowed radius
- **Severity**:
  - CRITICAL if >5x radius
  - HIGH if >3x radius
  - MEDIUM otherwise
- **Catches**: Photos taken far from job site

#### High Cancellation Rate
- **Trigger**: `AFTER UPDATE` on `bookings` (status → cancelled)
- **Check**: Rolling window (7 days, 30 days) + ratio
- **Thresholds**:
  - ≥3 cancellations in 7 days
  - >50% cancellation ratio in 30 days
- **Severity**: HIGH if ≥5 in 7 days or >70% ratio
- **Catches**: Booking spam, fake demand

#### Auto-Suspension
- **Trigger**: `AFTER INSERT` on `fraud_alerts` (severity = CRITICAL)
- **Action**:
  - Sets technician verification_status = 'suspended'
  - Sets is_active = false
  - Logs to audit_logs
- **Protection**: Immediately stops bad actors

### 3. Immutable Audit Trail

#### Audit Logs
- **Captures**: All booking changes, payment events, user actions
- **Storage**: Append-only (no updates/deletes via RLS)
- **Includes**: before_state, after_state, actor, timestamp, IP, device
- **Purpose**: Complete forensic trail for investigations

#### Payment Events
- **Captures**: Every payment state change
- **Storage**: Separate immutable ledger
- **Includes**: Idempotency keys, amounts, metadata
- **Purpose**: Financial audit trail, prevent double-charging

### 4. OTP Verification (Anti-Impersonation)

#### When Required
- Job start (technician_en_route → in_progress)
- Job completion (in_progress → awaiting_customer_confirmation)

#### How It Works
- 6-digit OTP generated server-side
- Expires in 15 minutes
- Max 3 attempts tracked
- Verified at state transition

#### Protection
- Prevents remote "completions"
- Requires physical presence (or customer sharing code)

### 5. Device Binding (Technicians Only)

#### One Active Device Rule
- Technician can only be logged in on ONE device
- New device login → previous device forced logout
- Creates MEDIUM severity fraud alert
- Risk score incremented

#### Protection
- Prevents account sharing
- Tracks suspicious device swapping
- Admin review on frequent changes

### 6. Payment Escrow + Idempotency

#### Escrow Flow
1. Customer books → payment created (pending)
2. Technician accepts → held_in_escrow
3. Job completed + verified → released (admin or auto)
4. Dispute → held until resolved

#### Auto-Release
- 7 days after completion (if no dispute)
- Runs via cron job every 6 hours
- Logs to ops_events

#### Idempotency
- All payment operations use unique keys
- Prevents double-charging on retry
- Immutable payment_events ledger

### 7. Operational Safeguards

#### SLA Breach Auto-Refund
- **Check**: Jobs not started 4+ hours after scheduled time
- **Action**: Automatic refund + booking cancellation
- **Protection**: Customer satisfaction, reduces fraud incentive

#### Inactive Technician Flagging
- **Check**: Technician not seen 1 hour before scheduled job
- **Action**: Fraud alert + flagged for reassignment
- **Protection**: Ensures technician availability

#### Repeat Dispute Tracking
- **Trigger**: Booking status → disputed
- **Action**: Increments customer dispute_count and risk_score
- **Alert**: ≥2 disputes creates fraud alert
- **Protection**: Identifies problematic customers

### 8. City-Level Feature Toggles

#### Granular Control
- Enable/disable features by city
- Examples: new_bookings, instant_booking, same_day_service
- Stored in `city_feature_toggles` table

#### Use Cases
- Pause new bookings during fraud spike
- Disable instant booking in high-risk areas
- Gradual rollout to new cities

## Fraud Cannot Win Because:

1. **Database enforces rules** - Frontend bypass impossible
2. **Automatic detection** - No manual review needed for detection
3. **Real-time action** - Critical alerts auto-suspend immediately
4. **Complete audit trail** - Every action logged immutably
5. **Multiple validation layers** - Photo + GPS + time + OTP
6. **Financial protection** - Escrow + idempotency + auto-refunds
7. **Operational monitoring** - Automated safety nets for SLA/inactivity

## For Investors

This system is:
- **Abuse-resistant**: Multiple overlapping fraud checks
- **Auditable**: Complete immutable logs of all actions
- **Automated**: Fraud detection and response without manual intervention
- **Scalable**: Database-level enforcement works at any volume
- **Explainable**: Clear logic for every alert and action
- **Operational**: 2-person team can manage via admin dashboard

The platform protects:
- ✅ Customer money (escrow + auto-refunds)
- ✅ Technician reputation (verified work proof)
- ✅ Platform integrity (auto-suspend bad actors)
- ✅ Legal compliance (complete audit trail)
