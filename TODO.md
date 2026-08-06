# Landing Page Redesign — Lingua

## Info Gathered

- TanStack Router + React 19 + Tailwind v4 + lucide-react
- Light premium theme, Instrument Serif display + Inter sans
- Deep indigo primary, muted neutral palette
- Live Supabase featured-mentors query exists in index.tsx — keep it
- Auth links: `/auth` mode signup, and role mentor

## Plan / Steps

- [x] 0. Explore repo & establish plan (approved)
- [x] 1. Update design tokens in `src/styles.css` (electric blue, refined shadows/glows, grid texture, marquee/fade keyframes)
- [x] 2. Build `reveal.tsx` scroll-reveal wrapper (GPU-friendly)
- [x] 3. Build `landing-navbar.tsx` (announcement bar + glassy nav)
- [x] 4. Build `hero.tsx` (art-directed, asymmetric, live product preview, floating stats)
- [x] 5. Build `stats.tsx` (animated metrics band)
- [x] 6. Build `features.tsx` (mixed layouts: split / vertical interactive / editorial)
- [x] 7. Build `how-it-works.tsx` (vertical timeline, alternating)
- [x] 8. Build `languages.tsx` (editorial marquee strip)
- [x] 9. Build `featured-mentors.tsx` (live data, loading/empty/error states)
- [x] 10. Build `testimonials.tsx` (asymmetric community proof)
- [x] 11. Build `pricing.tsx` (Student / Mentor tiers)
- [x] 12. Build `faq.tsx` (custom accordion)
- [x] 13. Build `mentor-cta.tsx` (dark indigo panel)
- [x] 14. Build `landing-footer.tsx`
- [x] 15. Rewrite `src/routes/index.tsx` to compose all sections
- [x] 16. Run dev server + verify compile (runs at localhost:8081, no landing errors)
- [x] 17. Final quality review vs. brief — page renders cleanly, all sections built, no landing errors
