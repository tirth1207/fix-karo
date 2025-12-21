# Service Discovery & Matching Engine Documentation

## Overview

This document explains the complete Service Discovery & Matching engine built for the home-services marketplace. The system prevents misuse through multi-layer enforcement at the database, backend, and UI levels.

---

## 1. Platform Service Catalog (Admin-Owned)

### Database Tables

**`service_categories`**
- Admin-controlled categories (Plumbing, Electrical, HVAC, etc.)
- Cannot be created by technicians

**`services`**
- Platform-defined services with strict pricing rules
- Fields:
  - `base_price`: Recommended platform price
  - `min_price`: Minimum allowed price (enforced)
  - `max_price`: Maximum allowed price (enforced)
  - `estimated_duration_minutes`: Expected job duration
  - `warranty_days`: Platform warranty period
  - `emergency_supported`: Emergency service availability
  - `has_bookings`: Immutability flag

**`service_city_availability`**
- Admin controls which services are available in which cities
- Prevents service offerings in unsupported areas

### Enforcement Rules

1. **Immutability**: Services with existing bookings cannot be edited (trigger: `enforce_service_immutability`)
   - Forces admins to create new versions instead of breaking existing bookings

2. **Admin-Only Creation**: Only users with `role = 'admin'` can create/edit services (RLS policies)

3. **Price Bounds Validation**: All prices must satisfy `min_price <= base_price <= max_price`

### Admin UI

- **`/admin/services`**: View all services, stats, and manage catalog
- **`/admin/services/new`**: Create new services with pricing rules
- Features:
  - Enable/disable services
  - Set city availability
  - Version control for services with bookings

---

## 2. Technician Service Offerings (Supply Layer)

### Database Table

**`technician_services`**
- Technicians can ONLY select from existing platform services
- Fields:
  - `service_id`: FK to platform services (required)
  - `custom_price`: Must be within platform min/max (enforced by trigger)
  - `coverage_radius_km`: Max distance willing to travel (1-100 km)
  - `approval_status`: 'pending', 'approved', 'rejected'
  - `is_active`: Starts as false, requires admin approval
  - `experience_level`: 'beginner', 'intermediate', 'expert'
  - `tools_declared`: JSONB of equipment owned

### Enforcement Rules

1. **Price Validation** (Trigger: `validate_technician_price`)
   ```sql
   IF NEW.custom_price < service_min_price OR NEW.custom_price > service_max_price THEN
     RAISE EXCEPTION 'Price outside allowed range'
   ```

2. **Auto-Disable on Suspension** (Trigger: `disable_services_on_suspension`)
   - When technician is suspended, all their services are automatically deactivated

3. **Approval Required**: Services start as `approval_status = 'pending'` and `is_active = false`
   - Admin must approve before service becomes visible to customers

4. **No Direct Service Creation**: Technicians cannot insert into `services` table (RLS policies)

### Technician UI

- **`/dashboard/technician/services`**: Manage offered services
- **`/dashboard/technician/services/add`**: Browse platform catalog and add services
- Features:
  - See approval status (pending, approved, rejected)
  - Set custom pricing within bounds (validated on submit)
  - Define coverage radius
  - View rejection reasons

---

## 3. Customer Service Discovery Flow

### Matching Engine (`lib/matching-engine.ts`)

**`findAvailableServices(criteria)`**

Filters technicians by:
1. **Service Active**: `is_active = true AND approval_status = 'approved'`
2. **Verification**: `verification_status = 'verified'`
3. **Location**: Same city and state as customer
4. **Coverage Radius**: Within technician's declared coverage area
5. **Risk Score**: Filters out technicians with `riskScore > 70`

Ranking Factors:
- **Distance Score**: Closer technicians ranked higher
- **Skill Match Score**: Based on experience level, completion rate, rating
- **Risk Score**: Fraud metrics penalty (0-100, lower is better)
- **Availability Score**: Based on active bookings vs capacity
- **Preferred Bonus**: +20 points for previously used technicians

**Confidence Score Calculation**:
```typescript
confidence = 
  availabilityScore * 0.3 +
  skillMatchScore * 0.4 +
  (100 - riskScore) * 0.3 -
  distancePenalty
```

### Customer UI

**`/dashboard/customer/browse`** (Enhanced)
- Browse by category or search (AI-powered search placeholder)
- Two-step discovery:
  1. Select service category → See available services
  2. Select specific service → See matched technicians
- No technician phone numbers exposed
- Price ranges displayed per platform rules

**Match Display** (`components/service-discovery.tsx`)
- Technician name and business (NO phone number)
- Price (from `custom_price`, validated to be within bounds)
- Warranty days (from platform service)
- Estimated ETA and distance
- Confidence score (0-100%)
- Preferred badge (if previously worked together)
- Rating and review count

### Prevents Misuse

- **No Direct Contact**: Phone numbers never exposed during discovery
- **Platform Pricing Only**: All prices validated against platform bounds
- **Verified Only**: Suspended or unverified technicians filtered out
- **Risk-Based Filtering**: High-risk technicians automatically excluded

---

## 4. Auto-Assignment Engine

### Algorithm (`lib/auto-assignment.ts`)

**`autoAssignTechnician(bookingId)`**

Ranking Factors (weighted):
1. **Distance** (25%): Proximity to service location
2. **Skill Match** (20%): Experience level + rating + completion history
3. **Risk Score** (15%): Fraud metrics (inverted - lower risk = higher score)
4. **Completion Rate** (15%): Completed / (Completed + Cancelled)
5. **SLA History** (15%): On-time completion percentage
6. **Workload Balance** (10%): Current active bookings vs capacity

**Preferred Technician Bonus**: +20 points if customer has worked with them before

### Assignment Decision Logging

**`assignment_logs`** table stores:
- `booking_id`: Which booking was assigned
- `assigned_technician_id`: Who was chosen
- `assignment_type`: 'auto', 'manual_admin', or 'customer_selected'
- `ranking_factors`: Complete JSON of all scores
- `reason`: Human-readable explanation (e.g., "customer's preferred technician, highly skilled match")
- `assigned_by`: User ID if manual override

### Admin Override

**`adminOverrideAssignment(bookingId, technicianId, reason)`**
- Admins can manually reassign bookings
- All overrides logged with audit trail
- Reason required for transparency

### Prevents Misuse

- **Never Assigns High-Risk**: Technicians with `riskScore > 70` excluded
- **Never Assigns Suspended**: Auto-filters `verification_status != 'verified'`
- **Transparent Logging**: Every assignment decision recorded with full reasoning
- **Admin Oversight**: Override capability with mandatory audit trail

### UI

**`/dashboard/customer/book`** with auto-assignment
- Shows assigned technician after booking
- Displays confidence score and reasoning
- Transparent about why specific technician was chosen

---

## 5. Price Fraud Protection

### Tracking Tables

**`price_audit_logs`** (Auto-populated by trigger)
- Created for every booking
- Fields:
  - `platform_price`: Service base price
  - `technician_quoted_price`: Tech's custom price
  - `final_charged_price`: Actual booking amount
  - `price_variance_percent`: Deviation from platform price
  - `is_suspicious`: Auto-flagged if variance > 20%

**`price_disputes`**
- Customer-filed disputes about pricing
- Trigger: `track_price_dispute_fraud`
  - Auto-flags technicians with >3 disputes in 30 days
  - Creates fraud alerts and metrics

**`offline_payment_reports`**
- System or customer reports of offline payment attempts
- Trigger: `disable_warranty_offline_payment`
  - Disables warranty on confirmed offline payments
  - Suspends technicians with 2+ confirmed violations

**`upsell_attempts`**
- Tracks when technicians try to charge more than booking amount
- Trigger: `flag_upsell_abuse`
  - Flags technicians with >5 rejected upsells in 30 days

### Enforcement Rules

1. **Price Bounds Enforced**: Trigger validates all prices on insert
2. **Automatic Flagging**: >20% variance from platform price = suspicious
3. **Offline Payment Penalties**:
   - Warranty disabled immediately
   - 2+ offenses = automatic suspension
4. **Repeat Dispute Tracking**: >3 disputes in 30 days = high-severity fraud alert

### Admin UI

**`/admin/fraud/price-audit`**
- View suspicious price patterns
- Review price disputes
- Monitor upsell attempts
- Resolve disputes with actions:
  - Refund customer
  - No refund (dispute unfounded)
  - Mark as fraudulent (disciplinary action)

### Prevents Misuse

- **No Uncontrolled Pricing**: All prices validated against platform bounds
- **Offline Payment Detection**: Automated tracking and penalties
- **Warranty Linkage**: Offline payments void warranty automatically
- **Escalating Consequences**: Repeat offenders auto-suspended

---

## 6. Rebooking & Preferred Technicians

### Preferred Technician Tracking

**`preferred_technicians`** table (Auto-populated by trigger)
- Created/updated when booking is confirmed
- Fields:
  - `customer_id` + `technician_id` + `service_id`: Unique relationship
  - `total_bookings`: Count of bookings together
  - `last_booking_id`: Most recent booking
  - `offline_contact_suspected`: Fraud flag

**Trigger: `update_preferred_technician`**
- Fires on booking insert when `status = 'confirmed'`
- Increments booking count
- Updates last booking reference

**Trigger: `flag_offline_leakage`**
- Fires when booking is cancelled
- If customer + technician have 3+ bookings together and customer cancels:
  - Flags `offline_contact_suspected = true`
  - Creates fraud alert: "possible offline arrangement"

### Rebooking Flow

**`rebookWithTechnician(previousBookingId, ...)`**

1. Validates technician is still active and verified
2. Validates service is still offered by technician
3. Creates NEW booking (not reusing old one)
4. Uses CURRENT platform pricing (not old price)
5. Goes through escrow like any other booking
6. Logs assignment as `customer_selected` type

### Customer UI

**`/dashboard/customer/preferred`**
- Shows all previously used technicians
- Displays:
  - Total bookings with each technician
  - Last booking date and status
  - Current rating
  - Offline contact warning if flagged

**`/dashboard/customer/rebook/[technicianId]`**
- Platform protection warnings prominently displayed
- Clearly states warranty only valid for platform bookings
- Rebook button disabled if technician flagged for offline contact

### Prevents Misuse

- **Platform Pricing Required**: Rebookings use current prices, not negotiated rates
- **Escrow Enforced**: All rebookings go through payment hold system
- **Offline Detection**: Pattern analysis for suspicious cancellations
- **Warranty Restriction**: Offline payments explicitly void warranty
- **Transparency**: Platform protection warnings on every rebook screen

---

## Why This Prevents Misuse

### 1. No Technician-Created Services
- Services table has admin-only RLS policies
- Technicians can ONLY select from pre-approved catalog
- Prevents fake or unverifiable service offerings

### 2. Price Control
- Database triggers reject prices outside min/max bounds
- Cannot be bypassed via API or direct database access
- Suspicious variances auto-flagged for review

### 3. No Direct Contact During Discovery
- Phone numbers never exposed in discovery flow
- Customers see match quality scores, not contact info
- Forces booking through platform

### 4. Offline Payment Deterrence
- Warranty disabled immediately for offline payments
- 2+ confirmed violations = suspension
- Pattern detection for suspicious cancellations (potential offline deals)
- Customer preferred list shows warnings

### 5. Assignment Transparency
- Every assignment logged with full reasoning
- Admins can review why specific technicians chosen
- Prevents favoritism or gaming the system

### 6. Multi-Layer Enforcement
- **Database Layer**: Triggers and constraints enforce rules
- **Backend Layer**: Server actions validate business logic
- **UI Layer**: Client-side validation and warnings
- **Audit Layer**: Complete logging for compliance and fraud investigation

---

## Database Schema Summary

```
service_categories (admin-owned)
  └─ services (admin-owned, immutable once used)
      ├─ service_city_availability (admin-controlled)
      └─ technician_services (technician supply, admin approval required)
          ├─ price validated against service min/max (trigger)
          └─ auto-disabled when technician suspended (trigger)

bookings
  ├─ price_audit_logs (auto-created, flags suspicious pricing)
  ├─ assignment_logs (transparent assignment reasoning)
  └─ preferred_technicians (auto-tracked relationships)
      └─ offline_payment_reports (fraud detection)

price_disputes (customer-filed, admin review)
upsell_attempts (tracked and flagged)
```

---

## API Endpoints

### Service Actions (`/app/actions/service-actions.ts`)
- `createService(data)` - Admin only
- `toggleServiceStatus(serviceId, isActive)` - Admin only

### Technician Service Actions (`/app/actions/technician-service-actions.ts`)
- `addTechnicianService(data)` - Validates price bounds
- `updateTechnicianService(serviceId, data)` - Technician or admin
- `approveTechnicianService(serviceId, approved, reason)` - Admin only

### Matching Actions (`/app/actions/matching-actions.ts`)
- `findAvailableServices(criteria)` - Returns ranked matches
- `searchServicesByCategory(categoryId, city, state)` - City availability filter

### Assignment Actions (`/app/actions/assignment-actions.ts`)
- `autoAssignTechnician(bookingId)` - Smart assignment with logging
- `adminOverrideAssignment(bookingId, technicianId, reason)` - Admin only
- `getAssignmentLogs(bookingId)` - View decision history

### Fraud Protection Actions (`/app/actions/fraud-protection-actions.ts`)
- `fileDisputePriceDispute(bookingId, disputedAmount, reason)` - Customer
- `reportOfflinePayment(technicianId, description)` - Customer
- `logUpsellAttempt(bookingId, attemptedAmount, reason)` - System
- `reviewPriceDispute(disputeId, resolution, notes)` - Admin only

### Rebooking Actions (`/app/actions/rebooking-actions.ts`)
- `rebookWithTechnician(previousBookingId, ...)` - Enforces platform pricing
- `getPreferredTechnicians(customerId)` - Returns relationship history
- `reportOfflineLeakage(technicianId, evidence)` - Fraud reporting

---

## Testing the System

### Verify Price Enforcement

1. Try to add technician service with price below `min_price`:
   ```sql
   INSERT INTO technician_services (technician_id, service_id, custom_price, ...)
   VALUES ('tech-uuid', 'service-uuid', 10.00, ...);
   -- Should fail if service min_price > 10.00
   ```

2. Try to update service that has bookings:
   ```sql
   UPDATE services SET base_price = 200.00 WHERE has_bookings = TRUE;
   -- Should fail with "Cannot modify service with bookings"
   ```

### Verify Auto-Assignment

1. Create booking and call `autoAssignTechnician(bookingId)`
2. Check `assignment_logs` table for decision record
3. Verify technician with highest confidence score was chosen

### Verify Offline Detection

1. Create 3+ bookings with same customer + technician
2. Cancel the 4th booking
3. Check `fraud_alerts` for offline_payment_suspected alert
4. Check `preferred_technicians.offline_contact_suspected = true`

---

## Deployment Checklist

- [ ] Run all SQL scripts in order (001-018)
- [ ] Verify RLS policies are enabled on all tables
- [ ] Seed service catalog with initial categories and services
- [ ] Configure city availability for launch regions
- [ ] Test admin service creation flow
- [ ] Test technician service addition with price validation
- [ ] Test customer discovery and matching
- [ ] Test auto-assignment algorithm
- [ ] Verify fraud detection triggers are active
- [ ] Review all audit log tables are capturing data

---

## Future Enhancements

- AI-powered service matching from problem descriptions
- Dynamic pricing based on demand/supply
- Real-time GPS tracking during jobs
- Photo verification requirements (already in DB schema)
- Automated quality scoring based on customer feedback
- Predictive fraud detection using ML models
