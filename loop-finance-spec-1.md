# Loop Finance — Product Specification

> **Know where every dollar should go before it arrives.**

---

## Vision

Loop is an AI-powered financial allocation platform built around goals, debts, and future planning — not expense tracking.

Most financial apps answer: *"Where did my money go?"*

Loop answers: *"Where should my money go next?"*

Every dollar gets an assignment before it's spent. The core habit is not monthly budgeting — it's **allocation at the moment money arrives**.

---

## Who It's For

| Type | Description | Examples |
|---|---|---|
| Salaried | Fixed schedule income | Monthly, biweekly, weekly salary |
| Freelancer | Project-based income | Designers, developers, consultants |
| Entrepreneur | Irregular income | Shop owners, agency owners, traders |
| Hybrid Earner | Salary + project income | Full-time employee with side gigs |

---

## Core Interaction: Money Arrival

> This is the heartbeat of the product.

When income is logged or detected, Loop interrupts with a single focused screen:

```
💰 $1,200 received.
Allocate according to plan?

Emergency Fund     $240  ████████░░  20%
Debt Repayment     $300  ████████░░  25%
Business Fund      $150  ████░░░░░░  12.5%
Family Support     $100  ███░░░░░░░   8%
Savings            $200  █████░░░░░  17%
Free Spending      $210  █████░░░░░  17.5%

[ ✓ Allocate Now ]   [ Adjust ]   [ Remind Me Later ]
```

One tap distributes funds across all active goals and obligations.

For freelancers and entrepreneurs, this interaction becomes the primary budgeting ritual — not a monthly review, but an event-driven allocation at the moment money lands.

### Money Arrival Trigger Sources
- Manual entry ("I just got paid")
- Future: bank webhook / transaction notification

---

## Income Profiles

First onboarding step. Users select their income pattern:

| Profile | Example |
|---|---|
| Monthly | $4,000 every month |
| Biweekly | $2,000 every two weeks |
| Weekly | $1,000 every week |
| Project Based | Freelance, irregular intervals |
| Mixed | Salary + freelance |

---

## One-Page Dashboard

The entire financial picture visible at a glance.

### Financial Snapshot
| | |
|---|---|
| Income This Month | $3,450 |
| Allocated | $2,800 |
| Remaining | $650 |
| Financial Health Score | 82 / 100 |

### Allocation Table

| Category | Current | Target | AI Rec | Progress |
|---|---|---|---|---|
| Emergency Fund | $1,200 | $5,000 | $250 | 24% |
| Debt | $800 | $0 | $300 | 60% |
| Business Fund | $450 | $3,000 | $150 | 15% |
| Family Support | $120 | Flexible | $100 | Active |
| Fun | $75 | Flexible | $75 | Active |

### Upcoming Events
- **Next Income:** June 15
- **Next Debt Payment:** June 18
- **Emergency Fund Goal:** 14 months remaining
- **Debt Free Date:** October 2026

---

## AI Allocation Engine

The engine is the core product intelligence.

Users define goals, priorities, debts, and personal rules. The AI determines optimal allocations and adjusts recommendations based on income variability.

### Allocation Modes

| Mode | Description |
|---|---|
| Aggressive Growth | Maximizes debt reduction and savings |
| Balanced | Balances lifestyle and long-term goals |
| Stability First | Prioritizes emergency funds and cash reserves |
| Family First | Prioritizes gifting, family support, obligations |
| Custom | User-defined priorities |

---

## Financial Rules Engine

Users define personal financial principles in plain language. The AI enforces them at allocation time.

**Examples:**
- "If I cannot buy it twice, I cannot afford it."
- "At least 10% goes to savings."
- "Always send $100 home first."
- "Never spend more than 5% on dining."

Rules take precedence over AI suggestions.

---

## AI Income Forecasting

The AI creates future cash flow estimates based on historical behavior.

**Inputs:** income history, payment frequency, seasonal trends, recurring clients, debt obligations, existing goals

**Output Example:**

| Scenario | Estimate |
|---|---|
| Conservative | $2,800 |
| Expected | $3,500 |
| Optimistic | $4,400 |

---

## Goal Management

Goals represent future dollar assignments.

**Examples:** Emergency Fund, Shop in Senegal, Vacation, Education, Home Purchase, Vehicle Purchase

**Each goal contains:**
- Target amount
- Deadline
- Priority level
- AI allocation recommendation
- Completion forecast

---

## Debt Management

Users create and manage personal debt records and define a repayment plan before sharing anything with a lender.

**Fields:**
- Lender name
- Original amount
- Remaining amount
- Installment amount
- Interest rate
- First payment date
- Payment frequency: weekly, monthly, or yearly
- Notes

### Debt Repayment Plan Workshop

When a loan is added, Loop generates a repayment plan from:
- Remaining balance
- Installment amount
- First payment date
- Payment frequency

The workshop previews:
- Number of installments until payoff
- Installment amount
- Frequency
- Upcoming installment dates
- Balance after each installment

Example:

```text
Loan: Family Loan
Remaining balance: $800
Installment amount: $150
First payment: June 18, 2026
Frequency: Monthly

Plan:
Installment 1   Jun 18   $150   Balance after: $650
Installment 2   Jul 18   $150   Balance after: $500
Installment 3   Aug 18   $150   Balance after: $350
...
Final installment   Nov 18   $50   Balance after: $0
```

The plan is currently deterministic and rule-based. Future AI features can propose revised installment amounts or frequencies, but the user must approve the plan before it is shared.

---

## Shareable Debt Portal

Each debt gets a unique shareable link for transparency with lenders.

**Lender can view:**
- Original amount
- Remaining balance
- Payment plan
- Installment frequency
- Upcoming installment dates and balance-after amounts
- Completion forecast

**Lender can:**
- Acknowledge the received plan
- Leave comments

**Lender cannot:**
- Modify any financial data

> **Note:** Consider read-only signed URLs with tamper-evident logs to ensure data integrity — lenders need to trust what they see.

---

## Debt Feasibility Analysis

The AI evaluates whether a repayment plan is realistic.

**Output Example:**

```
Completion Probability: 93%
Expected Completion: October 2026
Risk Level: Low

Alternative:
  Reduce payment from $250 → $180
  New completion: January 2027
```

---

## Category Health Monitoring

Every category gets a live health score.

| Category | Status |
|---|---|
| Emergency Fund | Healthy |
| Debt | At Risk |
| Family Support | Healthy |
| Business Fund | Growing |

---

## Predictive Alerts

The system proactively surfaces risks before they become problems.

**Examples:**
- "Your emergency fund will be depleted in 4 months if spending continues."
- "Your business fund will reach its target in 7 months."
- "Your current debt plan is unlikely to succeed."
- "Income variability may delay your vacation goal."

---

## AI Assistant

Users can ask scenario questions in plain language.

**Examples:**
- "Can I afford a $500 flight?"
- "What happens if I lose one client?"
- "When can I open my shop?"
- "What if I increase debt payments by 20%?"

The AI simulates future states and returns actionable answers.

---

## Tech Stack (Recommended)

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + Vite (mobile-first) + Capacitor for the mobile apps |
| Hosting | Firebase Hosting |
| Database | Firestore |
| Backend Logic | Firebase Cloud Functions |
| Auth | Firebase Authentication |
| Push Notifications | Firebase Cloud Messaging (for Money Arrival alerts) |
| AI | Claude API (allocation engine + assistant) |

---

## Notification Strategy

The Money Arrival habit only works with a smart notification layer.

**Triggers:**
- Manual "I got paid" tap → immediate allocation screen
- Scheduled reminder if income expected but not logged
- Alert when a debt payment date is approaching
- Alert when a category health score drops

**FCM** handles push delivery across iOS and Android via the Vue mobile app.

---

## What's Out of Scope (For Now)

- Bank integrations / Plaid
- Credit score tracking
- Investment management
- Receipt scanning
- Expense categorization automation

> The focus is: **allocation, forecasting, debt collaboration, and the Money Arrival ritual.**

---

## Implementation Addendum

This section defines the first implementation approach for allocation logic, mobile app delivery, and bilingual support.

---

## Deterministic Allocation Formula

Loop should not rely heavily on AI for the first version of the allocation engine. The initial engine should be deterministic, transparent, and auditable. AI can later improve recommendations, explain tradeoffs, and simulate future scenarios, but the core financial math should remain understandable.

### Allocation Flow

When income arrives:

```text
income_amount = amount received

required_allocations =
  fixed obligations
  + minimum debt payments
  + required rule-based allocations

remaining_income = income_amount - required_allocations
```

The remaining income is then distributed by weighted priorities:

```text
category_allocation =
  remaining_income * category_weight / total_active_weights
```

### Allocation Order

1. Apply hard user-defined rules first.
2. Apply minimum debt obligations.
3. Reserve required free spending or essential spending floors.
4. Allocate remaining income by weighted goals and categories.
5. Cap allocations that would exceed a goal target.
6. Redistribute overflow to the next eligible categories.
7. Generate a plain-language explanation of the allocation.

### Example

```text
Income received: $1,200

Required:
Family Support: $100
Minimum Debt Payment: $150

Remaining: $950

Weighted Priorities:
Emergency Fund: 30
Debt Extra: 25
Business Fund: 15
Savings: 20
Free Spending: 10

Total Weight: 100
```

Result:

```text
Family Support: $100 fixed
Debt Minimum: $150 fixed
Emergency Fund: $285
Debt Extra: $237.50
Business Fund: $142.50
Savings: $190
Free Spending: $95

Total Allocated: $1,200
```

### Rule Types

Personal financial rules should be translated into structured constraints.

| Rule Type | Example |
|---|---|
| Fixed amount | Always send $100 home first |
| Minimum percentage | At least 10% goes to savings |
| Maximum percentage | Never spend more than 5% on dining |
| Minimum amount | Put at least $200 toward debt |
| Conditional rule | If income is above $3,000, send extra to debt |

Rules take precedence over standard AI or mode-based recommendations.

### Allocation Mode Weights

Allocation modes should begin as configurable weight presets.

| Mode | Emergency Fund | Debt | Savings | Business | Family | Free Spending |
|---|---:|---:|---:|---:|---:|---:|
| Balanced | 25 | 25 | 20 | 15 | 10 | 5 |
| Aggressive Growth | 15 | 35 | 25 | 20 | 0 | 5 |
| Stability First | 40 | 20 | 20 | 10 | 0 | 10 |
| Family First | 25 | 20 | 15 | 0 | 30 | 10 |

Users should eventually be able to customize these weights.

---

## Mobile App Delivery with Capacitor

Loop should be built as a mobile-first Vue web app and wrapped with Capacitor for iOS and Android distribution.

### Mobile Build Path

```text
Vue 3 + Vite app
↓
Responsive mobile-first UI
↓
Firebase Auth / Firestore / Cloud Functions
↓
Capacitor wrapper
↓
iOS app via Xcode
↓
Android app via Android Studio
```

Capacitor should be added early in the project so the application can be tested as both a browser app and a mobile app throughout development.

### Capacitor Features to Plan For

| Feature | Purpose |
|---|---|
| Push notifications | Money Arrival alerts, debt due reminders, health alerts |
| Local notifications | Offline reminders and scheduled prompts |
| Secure storage | Secure handling for session-related data if needed |
| App links | Support shareable debt portal links |
| Biometrics | Future Face ID / fingerprint unlock |

The first version can be developed and tested in the browser, but the UI should be designed around mobile screens from the beginning.

---

## English and French Support

Loop should support English and French from day one.

### Internationalization

Use `vue-i18n` for all user-facing interface text.

Suggested locale files:

```text
src/locales/en.json
src/locales/fr.json
```

Example English strings:

```json
{
  "moneyArrival.title": "{amount} received.",
  "moneyArrival.question": "Allocate according to plan?",
  "actions.allocateNow": "Allocate Now",
  "actions.adjust": "Adjust",
  "actions.remindLater": "Remind Me Later"
}
```

Example French strings:

```json
{
  "moneyArrival.title": "{amount} reçu.",
  "moneyArrival.question": "Répartir selon le plan ?",
  "actions.allocateNow": "Répartir maintenant",
  "actions.adjust": "Modifier",
  "actions.remindLater": "Me le rappeler plus tard"
}
```

### Locale-Aware Money Formatting

Money should be stored as integer cents or the smallest currency unit, then formatted for the user's locale and currency.

Examples:

| Locale | Example |
|---|---|
| `en-US` | `$1,200.50` |
| `fr-FR` | `1 200,50 $US` |
| `fr-SN` | `1 200,50 $US` or localized XOF formatting |

The user's selected language and preferred currency should be saved during onboarding.

---

## Updated MVP Build Order

1. Scaffold Vue 3 + Vite mobile-first app.
2. Add Capacitor for iOS and Android readiness.
3. Add Firebase Auth, Firestore, Cloud Functions, and Hosting.
4. Add `vue-i18n` with English and French locale files.
5. Build onboarding with income profile, language preference, and currency preference.
6. Create data models for goals, debts, rules, income events, and allocation plans.
7. Build deterministic allocation formula.
8. Build the Money Arrival allocation screen.
9. Build the one-page dashboard.
10. Add basic income forecasting.
11. Add notification support through Capacitor and Firebase Cloud Messaging.
12. Add AI-generated explanations and scenario analysis.
13. Add the shareable debt portal.

The allocation formula should be the financial backbone of the product. AI should explain, simulate, and suggest improvements, but users should always be able to understand why each dollar was assigned where it went.
