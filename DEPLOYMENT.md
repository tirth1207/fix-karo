# Home Services MVP - Production Deployment Checklist

## Database Setup

### 1. Run SQL Migrations (in order)
```bash
# Execute in Supabase SQL editor or via CLI
001_create_database.sql
002_create_rls_policies.sql
003_create_triggers.sql
004_seed_data.sql
005_add_payment_functions.sql
006_booking_state_machine.sql
007_job_photos_and_gps.sql
008_automatic_fraud_detection.sql
009_immutable_audit_log.sql
010_payment_idempotency.sql
011_otp_device_binding.sql
012_operations_automation.sql
```

### 2. Verify Database Constraints
- ✅ Booking status transitions enforced by triggers
- ✅ Job photos table created with GPS columns
- ✅ Fraud detection triggers active
- ✅ Audit logs are immutable (no update/delete policies)
- ✅ Payment events are append-only
- ✅ OTP and device binding tables created

## Environment Variables

### Required for Production
```bash
# Supabase (already configured)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cron Jobs
CRON_SECRET=<generate-strong-secret>

# Optional: SMS/Email for OTP
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

## Vercel Cron Jobs

### Configure in vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/auto-release-payments",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/auto-reassign-inactive",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/sla-breach-refunds",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Schedule Details
- **Auto-release payments**: Every 6 hours
- **Inactive technician check**: Every 30 minutes
- **SLA breach refunds**: Every hour

## Security Verification

### 1. Row Level Security (RLS)
- ✅ All tables have RLS enabled
- ✅ audit_logs and payment_events are append-only
- ✅ Admin-only operations verified at DB level

### 2. Booking State Machine
- ✅ Only predefined transitions allowed
- ✅ Invalid transitions throw exceptions
- ✅ All changes logged to audit_logs

### 3. Job Completion Requirements
- ✅ Cannot complete without ≥1 photo
- ✅ GPS validation enforced at DB level
- ✅ Timestamp validation for photos

### 4. Fraud Detection (Automatic)
- ✅ Duplicate photo hash detection
- ✅ Rapid completion alerts
- ✅ GPS location mismatch alerts
- ✅ High cancellation rate tracking
- ✅ Auto-suspend on critical alerts

### 5. Payment Safety
- ✅ Idempotency keys prevent duplicates
- ✅ Payment events immutable ledger
- ✅ Auto-release after 7 days (no dispute)
- ✅ Admin-only manual release

## Testing Checklist

### Critical Paths
- [ ] Customer creates booking → payment held in escrow
- [ ] Technician accepts → state transitions to confirmed
- [ ] Invalid state transition → rejected by database
- [ ] Complete booking without photo → blocked by trigger
- [ ] Upload photo outside GPS radius → fraud alert created
- [ ] Duplicate photo hash → fraud alert + metrics updated
- [ ] Complete job in <10 minutes → high severity alert
- [ ] Critical alert created → technician auto-suspended
- [ ] Payment auto-release after 7 days
- [ ] OTP verification required for job start/completion
- [ ] New device login → previous device logged out (technicians)

### Fraud Scenarios to Verify
- [ ] Technician uploads same photo to multiple jobs
- [ ] Job completed in 5 minutes (expected 60)
- [ ] Photo taken 500m from service location
- [ ] Customer cancels 4+ bookings in 7 days
- [ ] 3+ disputes from same customer

## Monitoring Setup

### Key Metrics to Track
1. **Fraud Alerts by Severity** (`fraud_alerts` table)
2. **Payment Event Failures** (check for missing events)
3. **Audit Log Volume** (should always be growing)
4. **OPS Events** (automated actions taken)
5. **Device Binding Changes** (technician device swaps)

### Alerts to Configure
- Critical fraud alerts → notify ops team
- Failed cron jobs → engineering alert
- Payment release failures → finance team
- SLA breaches → customer success

## Operations Team Guide

### Daily Tasks
1. Review open fraud alerts (sort by severity)
2. Check ops_events for unusual patterns
3. Verify payment releases for completed jobs

### Responding to Fraud Alerts
- **Low/Medium**: Review and mark resolved or escalate
- **High**: Investigate within 24 hours
- **Critical**: Technician already suspended - review immediately

### Manual Override Procedures
All sensitive operations logged to `audit_logs`:
- Payment releases
- Technician suspension/reactivation
- Fraud alert resolution
- Device unbinding

## Feature Toggles

### City-Level Controls
```sql
-- Disable feature in a city
INSERT INTO city_feature_toggles (city, state, feature_name, is_enabled, disabled_reason)
VALUES ('San Francisco', 'CA', 'new_bookings', false, 'Temporary pause for maintenance');
```

### Available Features
- `new_bookings` - Allow new booking creation
- `instant_booking` - Skip admin approval
- `same_day_service` - Allow bookings <24h in advance

## Backup and Recovery

### Critical Data (Immutable)
- `audit_logs` - Never delete
- `payment_events` - Never delete
- `fraud_metrics` - Historical analysis

### Regular Backups
- Supabase automatic daily backups
- Weekly manual snapshot of fraud data
- Audit log exports to cold storage (monthly)

## Known Limitations (MVP)

1. **OTP Delivery**: Currently returned in API response (not SMS/email)
2. **Photo Storage**: URLs stored, actual blob storage separate
3. **Payment Processing**: Simulated (integrate Stripe in production)
4. **Auto-reassignment**: Flags only, manual reassignment required
5. **Device Fingerprinting**: Client-provided (can be spoofed)

## Next Steps for V2

- Integrate real payment processor (Stripe Connect)
- SMS/Email delivery for OTPs (Twilio/SendGrid)
- Advanced device fingerprinting (server-side)
- Machine learning fraud scoring
- Automated technician reassignment
- Mobile app with background GPS tracking
