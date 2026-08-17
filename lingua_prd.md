# Lingua — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Product Direction / MVP Definition  
**Date:** 2026-08-17

---

## 1. Product Summary

### Product

**Lingua** is a managed language-learning platform that connects students with suitable mentors and manages the complete learning relationship — from trial booking and mentor assignment to sessions, continuity, progress, and rebooking.

### Core Positioning

Lingua should **not** compete as another generic tutor marketplace.

The core proposition is:

> **Tell Lingua what you want to achieve, and Lingua takes responsibility for getting you there.**

Instead of forcing students to search through hundreds of tutors, Lingua manages matching, scheduling, mentor continuity, operational follow-up, and eventually measurable learning outcomes.

### Strategic Differentiation

Lingua's long-term moat should be:

1. Smart mentor matching
2. Mentor quality/reliability intelligence
3. Learning continuity between mentors
4. Measurable student progress
5. Operational automation
6. AI-assisted learning intelligence

---

# 2. Problem Statement

Existing tutoring marketplaces largely optimize for **choice**:

- Search tutors
- Compare profiles
- Read reviews
- Pick a tutor
- Book a session

This creates several problems:

- Students may not know which tutor is actually right for their goal.
- Finding the right tutor takes time.
- Tutor quality is difficult to predict from profiles alone.
- Scheduling can become fragmented.
- If a mentor becomes unavailable, continuity is lost.
- Learning progress is often represented as sessions rather than outcomes.
- Operations become difficult to manage as student volume grows.

Lingua aims to solve this by creating a **managed learning journey**.

---

# 3. Vision

Build a language-learning platform where students don't need to manage the complexity of finding, coordinating with, and maintaining a relationship with the right mentor.

Long term:

> **Lingua should optimize for learning outcomes, not lesson transactions.**

A student should eventually be able to say:

> "I need conversational English for job interviews within three months."

Lingua should determine:

- What level the student is currently at
- What skills are required
- Which mentor is best suited
- When sessions should happen
- What the student should work on next
- Whether the student is progressing
- Whether the student is at risk of dropping off

---

# 4. Product Principles

## 4.1 Outcome over sessions

The system should eventually optimize for measurable learning improvement rather than number of sessions completed.

## 4.2 Managed experience over marketplace choice

Students should receive intelligent guidance instead of being overwhelmed by tutor listings.

## 4.3 Human-first, AI-assisted

AI should initially assist mentors and operations rather than attempting to replace human mentors.

## 4.4 Automation with human override

Routine operations should become automated, while administrators retain control over exceptions.

## 4.5 Database-enforced business rules

Critical state transitions, credits, payments, scheduling conflicts, and assignments must be enforced server-side/database-side.

## 4.6 Privacy and security by default

Student, mentor, learning, and payment data must be protected using strict role-based access and database policies.

---

# 5. Target Users

## 5.1 Students

People who want to learn a language with a mentor and have a specific learning goal.

Examples:

- Improve conversational English
- Prepare for interviews
- Improve pronunciation
- Learn a language for travel
- Improve professional communication
- Prepare for an exam

## 5.2 Mentors

Qualified language instructors who conduct sessions, maintain availability, accept assignments, and track student progress.

## 5.3 Admins

Lingua operators responsible for:

- Student management
- Mentor management
- Mentor assignment
- Session operations
- Payment/credit oversight
- Exceptions
- Quality control
- Analytics

---

# 6. Competitive Context

Generic tutor marketplaces already provide:

- Tutor discovery
- Tutor profiles
- Scheduling
- Trial lessons
- Payments
- Reviews
- Video learning

Examples include Preply and Cambly.

Tutoring-management products also already provide:

- Student management
- Tutor management
- Scheduling
- Billing
- Payroll
- Business analytics

Examples include TutorCruncher and Teachworks.

Therefore:

> Lingua should not attempt to win by simply rebuilding tutoring infrastructure.

The differentiator should be the **managed learning journey**.

---

# 7. Product Scope

## 7.1 MVP Scope

The MVP should test one fundamental hypothesis:

> **Will students pay for and continue using a managed mentor-based language-learning experience?**

The MVP includes:

### Student

- Authentication
- Learning profile
- Language selection
- Learning goal
- Current level
- Availability
- Trial booking
- Payment
- Booking status
- Upcoming sessions
- Session history
- Mentor information
- Join session
- Book next session

### Mentor

- Authentication
- Mentor profile
- Languages
- Specializations
- Availability
- Assigned requests
- Accept/reject assignment
- Student details
- Upcoming sessions
- Join session
- Session notes
- Mark session complete

### Admin

- Student management
- Mentor management
- Trial request queue
- Mentor assignment
- Reassignment
- Acceptance timeout handling
- Session management
- Payment/session status
- Student history
- Mentor history
- Basic operational analytics

---

# 8. Explicitly Out of MVP

The following should NOT be built before product validation:

- Native mobile apps
- AI tutor replacement
- Large course library
- Social/community platform
- Gamification
- Certificates
- Complex marketplace bidding
- Advanced recommendation engine
- Dozens of languages
- Advanced AI pronunciation engine
- Complex subscription architecture
- Advanced learning analytics
- Large-scale LMS functionality

These can be considered only after MVP validation.

---

# 9. Core User Journey

## 9.1 Student Journey

```text
Sign Up
   ↓
Complete Learning Profile
   ↓
Select Goal
   ↓
Book Trial
   ↓
Payment
   ↓
Trial Request Created
   ↓
Admin / Matching Engine
   ↓
Mentor Assigned
   ↓
Mentor Acceptance
   ↓
Session Confirmed
   ↓
Student Attends Session
   ↓
Session Completed
   ↓
Mentor Notes
   ↓
Student Receives Follow-up
   ↓
Book Next Session
```

---

# 10. Mentor Assignment Flow

The assignment system is a core Lingua capability.

## 10.1 Initial MVP Flow

```text
Trial Request
      ↓
Admin Assigns Mentor
      ↓
Mentor Receives Request
      ↓
15-Minute Acceptance Window
      ↓
Accepted?
  /        \
YES        NO / TIMEOUT
 |             |
Confirm       Reassign
               |
               ↓
          Next Eligible Mentor
```

## 10.2 Requirements

Each assignment must store:

- assignment_id
- student_id
- mentor_id
- assigned_at
- expires_at
- status
- accepted_at
- rejected_at
- rejection_reason

## 10.3 Critical Rule

Assignment acceptance must be atomic.

Two mentors must never be able to successfully accept the same assignment.

This must be enforced server-side/database-side, not only through frontend logic.

---

# 11. Booking State Machine

The system should use explicit booking states.

Recommended states:

```text
draft
trial_requested
payment_pending
payment_confirmed
admin_review
mentor_assigned
mentor_pending
mentor_accepted
mentor_rejected
mentor_timeout
confirmed
rescheduled
student_cancelled
mentor_cancelled
no_show_student
no_show_mentor
completed
refunded
```

Only valid state transitions should be permitted.

The UI must not directly manipulate critical states without server-side validation.

---

# 12. Scheduling Requirements

## 12.1 Timezone

All canonical session timestamps should be stored in UTC.

Users should see times in their local timezone.

Never use strings such as:

```text
"Tuesday 7 PM"
```

as the canonical session timestamp.

## 12.2 Availability

Mentor availability should support:

- Weekday
- Start time
- End time
- Timezone
- Effective date
- Active/inactive status

## 12.3 Exceptions

The system must support:

- Holidays
- Temporary unavailable dates
- One-off availability
- Mentor leave

Recommended entity:

`availability_exceptions`

## 12.4 Double Booking

The database must prevent conflicting confirmed sessions for the same mentor.

Frontend checks alone are insufficient.

---

# 13. Payment & Credits

## 13.1 Payment Principles

Payment state must be independent from UI state.

Example:

```text
payment_pending
payment_processing
payment_succeeded
payment_failed
payment_refunded
```

## 13.2 Idempotency

Payment webhooks can be retried.

Every payment event must have an idempotency mechanism.

Example:

```text
payment_event_id UNIQUE
```

A duplicated webhook must never create duplicate credits or sessions.

---

# 14. Credit Ledger

Credits should not be represented only as a mutable balance.

Recommended model:

```text
credit_ledger

id
student_id
transaction_type
amount
reference_type
reference_id
created_at
metadata
```

Examples:

```text
+5 credits  → purchase
-1 credit  → completed session
+1 credit  → mentor cancellation
+1 credit  → approved refund
```

The balance should be derived from ledger entries.

This provides auditability and reduces accounting inconsistencies.

---

# 15. Cancellation & Refund Policies

The system must support explicit policies.

Example:

### Student cancels early

→ Credit returned according to policy

### Student cancels late

→ Partial/no credit depending on policy

### Mentor cancels

→ Full credit restoration + replacement flow

### Mentor no-show

→ Full credit + compensation policy

### Student no-show

→ Policy-dependent outcome

These rules must be implemented centrally rather than duplicated across UI components.

---

# 16. Mentor Quality System

This should begin as an internal/admin capability and eventually power automatic matching.

Potential metrics:

- Acceptance rate
- Average response time
- Attendance rate
- Cancellation rate
- Student rating
- Student retention
- Session completion rate
- Student progress
- Rebooking rate

Future concept:

```text
Mentor Reliability Score
```

This should influence assignment priority.

---

# 17. Matching Engine

## MVP

Manual admin assignment.

## Phase 2

Rule-based matching.

Potential factors:

```text
Language
+
Student level
+
Learning goal
+
Mentor specialization
+
Availability
+
Timezone
+
Mentor quality
+
Historical success
```

## Phase 3

Data-driven matching.

Example:

```text
Student Profile
       ↓
Eligible Mentors
       ↓
Matching Score
       ↓
Top Candidates
       ↓
Admin Confirmation
```

## Phase 4

Automatic assignment with human override.

---

# 18. Learning Continuity

A major differentiator should be mentor-to-mentor continuity.

If a student changes mentors, the new mentor should receive relevant context.

Student learning context may include:

- Current level
- Goal
- Previous session topics
- Common mistakes
- Vocabulary
- Homework
- Mentor notes
- Previous progress
- Recommended next objective

The student should not need to repeatedly explain their history.

---

# 19. Session Notes

Mentors should be able to record:

- Topics covered
- Strengths
- Weaknesses
- Mistakes
- Vocabulary
- Homework
- Recommended practice
- Next-session objective

These notes form the foundation for future learning intelligence.

---

# 20. AI Roadmap

AI should initially be an assistant, not the primary teacher.

## Phase 1

AI-generated:

- Session summaries
- Vocabulary extraction
- Mistake identification
- Homework suggestions
- Next-session suggestions

Mentor must review/approve AI output.

## Phase 2

AI analyzes historical sessions.

Potential outputs:

- Learning trends
- Repeated mistakes
- Weak skill areas
- Engagement changes
- Recommended practice

## Phase 3

AI-assisted outcome prediction.

Examples:

- Student at risk of churn
- Student progressing faster/slower than expected
- Recommended mentor change
- Recommended learning intensity

---

# 21. Student Progress Engine

Long-term, Lingua should track:

```text
Starting Level
      ↓
Sessions
      ↓
Practice
      ↓
Assessments
      ↓
Progress Signals
      ↓
Current Estimated Level
      ↓
Goal Completion
```

Potential metrics:

- Speaking
- Listening
- Grammar
- Vocabulary
- Pronunciation
- Confidence
- Goal-specific competency

The system should eventually optimize for:

> **Outcome achieved**

rather than:

> **Sessions completed**

---

# 22. At-Risk Student Detection

The platform should eventually detect engagement risks.

Example signals:

```text
No booking for 10+ days
Repeated cancellations
Declining attendance
Low mentor rating
Reduced activity
No homework completion
```

Output:

```text
Student Risk = HIGH
```

Admin receives an actionable alert.

---

# 23. Admin Dashboard

The Admin Dashboard is the operational control center.

## Required sections

### Overview

- Pending trial requests
- Mentor assignments
- Sessions today
- Pending mentor responses
- Payment issues
- At-risk students

### Students

- Search
- Filters
- Profile
- Learning history
- Sessions
- Payments
- Credits
- Mentor history

### Mentors

- Profile
- Availability
- Assignments
- Acceptance rate
- Attendance
- Student ratings
- Reliability indicators

### Assignments

- Pending
- Accepted
- Rejected
- Expired
- Reassigned

### Sessions

- Upcoming
- Completed
- Cancelled
- No-show

### Payments

- Successful
- Failed
- Refunded
- Credits

---

# 24. Student Dashboard

The dashboard should remain intentionally simple.

Primary information:

### Next Session

- Mentor
- Date/time
- Join button
- Session status

### Learning Progress

- Current goal
- Progress
- Recent improvement

### Next Action

One strong CTA:

> **Book Your Next Session**

The product should avoid overwhelming students with unnecessary information.

---

# 25. Mentor Dashboard

Primary sections:

### Today

- Upcoming sessions
- Pending assignments

### Requests

- Student
- Goal
- Level
- Time
- Accept/reject

### Students

- Active students
- Learning history
- Notes

### Availability

- Weekly schedule
- Exceptions

### Performance

- Acceptance rate
- Attendance
- Student feedback

---

# 26. Notifications

MVP channels:

- Email
- In-app notifications

Potential future channels:

- WhatsApp
- SMS
- Push notifications

Important notification events:

- Trial booked
- Payment successful
- Mentor assigned
- Mentor accepted
- Mentor rejected
- Mentor timeout
- Session reminder
- Session cancelled
- Session completed
- Next-session reminder
- Credit/refund event

Notifications should be event-driven where possible.

---

# 27. Recommended Technology Stack

## Frontend

**Next.js + TypeScript**

Keep the existing stack.

## Database / Auth

**Supabase + PostgreSQL + Supabase Auth**

Keep the existing infrastructure.

## Payments

**Stripe**

Use Stripe webhooks and idempotent payment handling.

If marketplace-style mentor payouts are introduced later, evaluate Stripe Connect.

## Email

**Resend** or equivalent transactional email provider.

## Video

Use a managed provider such as:

- Zoom
- Google Meet
- Daily
- Whereby

Do not build video infrastructure for MVP.

## Hosting

Use the existing Next.js-compatible deployment platform.

## AI

Use an API-based LLM only after core workflows are stable.

Do not make AI a hard dependency for core booking functionality.

---

# 28. High-Level Architecture

```text
                 ┌─────────────────────┐
                 │      Next.js        │
                 │     Web Client      │
                 └──────────┬──────────┘
                            │
                     Server Actions
                       / API Layer
                            │
                 ┌──────────▼──────────┐
                 │   Business Logic    │
                 │ Domain Operations   │
                 └──────────┬──────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
 ┌────────────┐      ┌────────────┐      ┌────────────┐
 │  Supabase  │      │   Stripe   │      │   Resend   │
 │ PostgreSQL │      │  Payments  │      │   Email    │
 │ Auth / RLS │      │  Webhooks  │      │ Notifications│
 └────────────┘      └────────────┘      └────────────┘
        │
        ├── Students
        ├── Mentors
        ├── Sessions
        ├── Assignments
        ├── Availability
        ├── Payments
        ├── Credit Ledger
        ├── Learning Notes
        └── Audit Logs
```

---

# 29. Suggested Core Database Domains

The exact schema can evolve, but the architecture should be organized around domains.

## Identity

- profiles
- roles
- student_profiles
- mentor_profiles

## Scheduling

- mentor_availability
- availability_exceptions
- sessions

## Booking

- trial_requests
- assignments
- booking_state_history

## Payments

- payments
- payment_events
- credit_ledger
- refunds

## Learning

- learning_goals
- session_notes
- learning_progress
- assessments

## Notifications

- notifications
- notification_events

## Operations

- admin_actions
- audit_logs

---

# 30. Security Requirements

## Roles

At minimum:

```text
student
mentor
admin
```

## Requirements

- Supabase Row Level Security
- Server-side authorization
- Least-privilege database access
- No sensitive data exposed through client queries
- Audit logging for critical admin operations
- Secure webhook validation
- Payment data should not be stored unnecessarily
- No destructive production DB operations through AI agents

---

# 31. AI Agent / MCP Safety

Because development agents may have Supabase MCP access:

### Production database must be protected from destructive operations.

Agents should not be allowed to casually execute:

```text
DROP TABLE
TRUNCATE
DROP SCHEMA
DELETE FROM <critical table>
ALTER destructive schema operations
```

without explicit human review.

Recommended workflow:

```text
Agent proposes migration
        ↓
Human reviews
        ↓
Migration file created
        ↓
Test/staging
        ↓
Production deployment
```

Prefer migrations and reviewed RPCs over arbitrary SQL execution.

---

# 32. Observability

The MVP should include enough logging to debug operational problems.

Track:

- Booking state changes
- Assignment events
- Mentor acceptance/rejection
- Payment webhooks
- Credit changes
- Session state changes
- Admin actions
- Notification delivery status

Critical operations should include:

```text
actor
timestamp
entity
old_state
new_state
reason
metadata
```

---

# 33. Key Metrics

## Primary Metric

### Trial → Next Session Conversion

This measures whether students actually value the experience.

## Secondary Metrics

### Acquisition

- Signups
- Trial bookings

### Activation

- Trial payment rate
- Trial attendance rate

### Retention

- Trial → next session
- 4-session retention
- 30-day retention
- 90-day retention

### Mentor Operations

- Assignment acceptance rate
- Average response time
- Mentor cancellation rate
- Mentor attendance

### Business

- Revenue per student
- Average sessions per student
- Refund rate
- Mentor payout cost
- Gross margin

---

# 34. MVP Success Criteria

The MVP should not be considered successful simply because all features work.

The initial validation target should be:

1. Students successfully book trials.
2. Payments work reliably.
3. Mentors reliably accept assignments.
4. Students attend sessions.
5. Students book subsequent sessions.
6. Admin operational workload remains manageable.
7. Students report meaningful value.

A strong early signal would be:

> **40%+ Trial → Next Session conversion**

This is not a universal industry benchmark; it should be treated as an internal validation target rather than a guaranteed market standard.

---

# 35. Operational Scalability

## Current

```text
Admin assigns mentor
```

## Next

```text
Rules suggest mentor
Admin confirms
```

## Later

```text
System automatically assigns
Admin handles exceptions
```

The long-term goal is:

> **Admins manage exceptions, not routine operations.**

---

# 36. Risks

## Risk 1 — Commodity positioning

If Lingua becomes another tutor marketplace, differentiation will be weak.

### Mitigation

Focus on managed matching, continuity and outcomes.

---

## Risk 2 — Mentor quality

Bad mentors can destroy retention.

### Mitigation

Quality scoring, onboarding, feedback, attendance tracking.

---

## Risk 3 — Admin bottleneck

Manual assignment doesn't scale.

### Mitigation

Build assignment logic as a replaceable system that can evolve from manual to automated.

---

## Risk 4 — Scheduling complexity

Timezones, exceptions and double booking can create severe bugs.

### Mitigation

UTC storage, explicit availability model, database conflict protection.

---

## Risk 5 — Payment inconsistency

Webhook retries and refunds can corrupt balances.

### Mitigation

Idempotent payment events + immutable credit ledger.

---

## Risk 6 — Feature creep

AI, mobile apps, gamification and social features can delay validation.

### Mitigation

MVP scope must remain centered around:

```text
Trial
→ Mentor
→ Session
→ Next Session
```

---

# 37. Edge Cases

The system must eventually handle:

- Mentor rejects assignment
- Mentor doesn't respond
- Two mentors accept simultaneously
- Student cancels
- Mentor cancels
- Student no-show
- Mentor no-show
- Payment succeeds but booking fails
- Booking succeeds but payment fails
- Duplicate payment webhook
- Duplicate booking request
- Student changes timezone
- Mentor changes timezone
- Mentor becomes unavailable
- Session rescheduling
- Network failure during booking
- Browser closes during payment
- Payment webhook delayed
- Notification delivery failure
- Admin manually overrides assignment
- Student changes mentor
- Mentor becomes inactive
- Credit refund after previous credit usage

---

# 38. 3–6 Month Technical Risks

The system should be designed now to avoid:

### Race conditions

Booking and assignment operations must be transactional.

### Data inconsistency

Critical business state should have one authoritative source.

### Manual admin overload

Automate repetitive operational flows.

### Permission leakage

Review RLS policies continuously.

### Payment reconciliation

Maintain complete payment and credit history.

### Timezone bugs

Use UTC internally.

### Poor observability

Maintain audit/event history.

---

# 39. Product Roadmap

## Phase 1 — MVP

### Goal

Validate student demand and repeat usage.

Build:

- Student flow
- Mentor flow
- Admin flow
- Trial booking
- Payment
- Assignment
- 15-minute acceptance
- Session management
- Credits
- Notifications
- Basic analytics

---

## Phase 2 — Smart Operations

### Goal

Reduce admin workload.

Build:

- Rule-based matching
- Mentor reliability score
- Automated reassignment
- Better availability engine
- Cancellation automation
- At-risk student detection

---

## Phase 3 — Learning Intelligence

### Goal

Make Lingua more than a booking platform.

Build:

- Session summaries
- Learning profiles
- Progress tracking
- AI-assisted notes
- Personalized homework
- Learning recommendations

---

## Phase 4 — Outcome Platform

### Goal

Make measurable progress the product moat.

Build:

- Skill assessments
- Progress scoring
- Goal tracking
- Outcome prediction
- Personalized learning plans
- Mentor effectiveness analytics

---

# 40. Innovation Roadmap

## Innovation 1 — Mentor DNA

Build a dynamic mentor profile based on actual outcomes, not just self-reported bio information.

Example:

```text
Strong with beginners
Excellent interview preparation
High retention
Strong pronunciation coaching
```

---

## Innovation 2 — Learning Continuity Engine

When a student changes mentors, the new mentor receives structured historical context automatically.

---

## Innovation 3 — Mentor Reliability Score

Use operational data to prioritize dependable mentors.

---

## Innovation 4 — Student Risk Engine

Identify students likely to churn before they disappear.

---

## Innovation 5 — Outcome-Based Matching

Match mentors to student goals rather than merely language/category.

---

# 41. MVP Development Estimate

For an experienced solo developer already familiar with the existing stack:

### Functional MVP

**Approximately 3–5 focused weeks**

Potential breakdown:

| Area | Estimate |
|---|---:|
| Domain/database cleanup | 3–5 days |
| Student flow | 3–4 days |
| Mentor flow | 3–5 days |
| Admin operations | 5–7 days |
| Booking/availability | 3–5 days |
| Payments | 2–4 days |
| Notifications | 1–3 days |
| Testing & edge cases | 5–7 days |

### Production-quality v1

**Approximately 6–10 weeks**

The additional time is primarily for:

- Security
- Payment failure handling
- Timezone handling
- Race conditions
- Cancellation policies
- Permissions
- Testing
- Operational tooling
- Observability

---

# 42. Recommended MVP Definition

If development needs to be cut aggressively, the absolute minimum viable loop is:

```text
Student
  ↓
Learning Profile
  ↓
Book Trial
  ↓
Pay
  ↓
Admin Assigns Mentor
  ↓
Mentor Accepts
  ↓
Session Happens
  ↓
Mentor Adds Notes
  ↓
Student Books Next Session
```

If this loop does not work reliably, no additional feature should be prioritized.

---

# 43. Product North Star

Lingua should eventually become:

> **The operating system for a student's language-learning journey.**

Not:

> A website for booking tutors.

The long-term system should understand:

```text
WHO the student is
        ↓
WHAT they want
        ↓
WHERE they currently are
        ↓
WHICH mentor is best
        ↓
WHAT they should learn next
        ↓
WHETHER they are improving
        ↓
WHAT action should happen next
```

---

# 44. Final Product Strategy

The recommended strategy is:

### Do not compete on:

- Number of tutors
- Number of languages
- Number of features
- Generic AI chatbot functionality
- Dashboard complexity

### Compete on:

- Better matching
- Better mentor quality
- Better continuity
- Better operational reliability
- Better student experience
- Better measurable outcomes

The core product loop is:

```text
Goal
 ↓
Match
 ↓
Trial
 ↓
Great Mentor
 ↓
Great Session
 ↓
Learning Data
 ↓
Progress
 ↓
Next Best Action
 ↓
Retention
 ↓
Outcome
```

If Lingua can reliably execute this loop better than generic tutoring marketplaces, it has a meaningful reason to exist.

---

# 45. Immediate Engineering Priority

Before adding major new features, stabilize these systems:

1. **Booking state machine**
2. **Mentor assignment state machine**
3. **15-minute mentor acceptance timeout**
4. **Atomic assignment acceptance**
5. **Availability and double-booking protection**
6. **UTC/timezone handling**
7. **Stripe webhook idempotency**
8. **Credit ledger**
9. **Cancellation/refund rules**
10. **Strict Supabase RLS**
11. **Audit logs**
12. **Admin operational queue**

Once these are reliable, build the smart matching layer.

---

# 46. Final MVP Test

The first real-world experiment should answer:

> **Can Lingua consistently take a student from “I want to learn” to “I want another session with Lingua”?**

If yes:

**Scale and automate.**

If no:

**Investigate the learning experience before adding features.**

---

## One-Line Product Definition

> **Lingua is a managed language-learning platform that matches students with the right mentors, manages the learning relationship, and progressively optimizes for measurable learning outcomes.**
