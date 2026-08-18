---
total_score: 17
p2_count: 1
na_heuristics: 5,9,10
max_score: 28
p0_count: 2
target: src/routes/index.tsx
p1_count: 2
timestamp: 2026-08-18T05-30-01Z
slug: src-routes-index-tsx
---
# Lingua Landing Page — Critique Report

## Report Header Provenance

⚠️ DEGRADED: single-context (Assessment B sub-agent aborted; detector and review completed inline)

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Cinema play/pause gives status, but no loading/breadcrumb states |
| 2 | Match System / Real World | 3 | "Real humans, not AI chatbots" is strong; currency mismatch breaks consistency |
| 3 | User Control and Freedom | 3 | Cinema has play/pause; no skip-animation toggle or back-to-top |
| 4 | Consistency and Standards | 4 | Button styles, card radii, shadows, and color usage are consistent |
| 5 | Error Prevention | n/a | No forms or destructive actions on landing page |
| 6 | Recognition Rather Than Recall | 3 | Visual mockups help, but Cinema + Journey redundancy forces recall |
| 7 | Flexibility and Efficiency of Use | 2 | No keyboard shortcuts for Cinema; no power-user path |
| 8 | Aesthetic and Minimalist Design | 2 | Aurora, fine-grid, gradient blobs, and card shadows create visual noise ceiling |
| 9 | Error Recovery | n/a | No error states on landing page |
| 10 | Help and Documentation | n/a | No help/documentation on marketing page |
| **Total** | | **17/28** | **Acceptable** |

*Scored 7 of 10 heuristics; 3 marked n/a. Renormalized maximum is 28.*

---

## Design Specificity Verdict

**LLM assessment**: Authored for Lingua, but with category-interchangeable tendencies. The "Real humans, not AI chatbots" badge, ProductPreview mockup, and verified-mentor indicators are product-specific. However, the Cinema + Journey redundancy, generic section headings, and currency inconsistency make parts feel template-swappable.

**Deterministic scan**: Detector returned clean ([]). No automated findings. The detector did not catch the issues the LLM review identified — currency mismatch, primary-color overuse, narrative redundancy, missing reassurance micro-copy, or Instrument Serif absence from the hero.

**Browser visualization**: Skipped — no browser automation tool available in this session.

---

## Overall Impression

The landing page has a strong structural narrative and polished motion design, but it undermines its own differentiation through visual over-decorating and narrative redundancy. The single biggest opportunity is tightening the story: one cohesive product demo instead of two overlapping ones, and restoring Twilight Auth restraint so primary actions actually signal.

---

## What's Working

1. **ProductPreview mockup in Hero** (hero.tsx:12-104) — The most Lingua-specific element. The interactive day-selector and mentor-card styling communicate the core scheduling mechanic instantly.
2. **Scroll-reveal system** (eveal.tsx) — Lightweight, GPU-friendly, respects prefers-reduced-motion, and cleans up will-change after transition. Production-quality motion.
3. **Narrative structure** — Hero → Cinema → Journey → Benefits → Testimonials → CTA is a sound arc. The auto-playing Cinema differentiates from generic tutor-marketplace pages.

---

## Priority Issues

### [P0] Currency Inconsistency
**Files**: hero.tsx:56 shows ₹49/month, product-journey.tsx:51 shows $25 per session.  
**Why it matters**: Destroys product specificity and trust.  
**Fix**: Resolve to a single canonical currency display via i18n or remove one mockup.  
**Suggested command**: /impeccable clarify

### [P0] Twilight Auth Overuse
**Files**: Every section uses 	ext-primary or g-primary. DESIGN.md states "Primary appears on ≤15% of any given screen."  
**Why it matters**: The deep violet has become the default rather than the directional signal. This flattens visual hierarchy.  
**Fix**: Audit landing sections and reduce primary usage to CTAs and active states only. Use secondary or muted for section accents.  
**Suggested command**: /impeccable colorize

### [P1] Redundant Narrative (Cinema + Journey)
**Files**: product-cinema.tsx and product-journey.tsx both cover Discover/Connect/Learn/Progress sequentially.  
**Why it matters**: Users process the same narrative twice with different interaction patterns. Creates cognitive fatigue.  
**Fix**: Merge or differentiate — make Cinema the emotional brand film and Journey the first-time user walkthrough, or change Journey to cover different steps.  
**Suggested command**: /impeccable distill

### [P1] Missing Risk Reassurance at CTA
**Files**: hero.tsx:140-149, inal-cta.tsx:25-29  
**Why it matters**: "Start Learning" carries no micro-copy like "Free trial · No credit card." Conversion gap.  
**Fix**: Add a one-line reassurance adjacent to primary CTAs.  
**Suggested command**: /impeccable clarify

### [P2] Instrument Serif Absent from Hero
**Files**: hero.tsx:128, DESIGN.md 	ypography.display  
**Why it matters**: DESIGN.md specifies Instrument Serif for hero headlines. The hero uses ont-heading (Sora) instead. Weakens the "Fluent Mind" editorial authority.  
**Fix**: Apply ont-display to the hero headline.  
**Suggested command**: /impeccable typeset

---

## Persona Red Flags

### Jordan (Confused First-Timer)
- Cinema auto-plays with no visible "skip" control. No reassurance copy on "Start Learning" CTA.

### Casey (Distracted Mobile User)
- Primary CTA is in the hero top half, not the thumb zone. Cinema auto-plays 16s of animation before user can proceed.

### Riley (Deliberate Stress Tester)
- Currency mismatch (₹49 vs $25) undermines trust immediately.
- Social links in footer are all href="#" — broken on click.
- FAQ anchor points to no existing section.

---

## Minor Observations

1. Social links (landing-footer.tsx:61-69): All href="#" — placeholder stubs.
2. Footer nav (landing-footer.tsx:18-20): "About," "Careers," "Blog" all link to /auth.
3. Mentor avatar initials: Hardcoded "MG" / "M" across Cinema and Journey creates uncanny "only one mentor exists" feeling.
4. No Pricing section: Mockup pricing exists but no actual pricing section. Ambiguous product model.
5. g-brand-gradient outside hero: Used in testimonials and navbar. May violate DESIGN.md gradient restriction.

---

## Questions to Consider

1. If Cinema and Journey tell the same story, what is each uniquely selling?
2. Why does the landing page have zero pricing transparency? Is Lingua subscription, per-session, or credit-based?
3. The "Real humans, not AI chatbots" badge is the most differentiated copy — why is it buried as a tiny pill?
4. If mentors are the supply-side critical path, is the landing page optimizing for the right audience?
5. DESIGN.md restricts gradients to hero moments, yet g-brand-gradient appears in testimonials and navbar. Spec violation or spec needs updating?
