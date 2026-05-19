# Product

## Register

product

## Users

**In-house recruiters** at SMBs and mid-market companies: talent teams managing their own open roles, moving fast, juggling multiple pipelines at once. They live in the kanban board for hours a day.

**Agency recruiters** at staffing firms: managing candidates across multiple client accounts, often with higher volume and tighter turnaround. They care about throughput and visibility across clients.

Both groups are comfortable with modern SaaS tools (they use Notion, Linear, Slack). They are not IT professionals. They expect things to work without configuration.

## Product Purpose

Coreflow is an AI-first applicant tracking system (ATS) for in-house and agency recruiters. It manages the full hiring pipeline: sourcing, CV import and parsing, candidate scoring, interview scheduling, offer generation, and reporting.

The core differentiator is AI embedded natively into the workflow: CV parsing with Claude extracts structured data on import, scoring surfaces fit automatically, and enrichment happens without manual effort.

Success looks like: a recruiter can import 50 CVs, see a ranked shortlist, schedule interviews, and send an offer without leaving the product.

## Brand Personality

Precise, calm, capable.

Voice: direct and confident. No hedging, no exclamation points, no "Woohoo!" moments. The product does serious work for professionals; it respects their intelligence. When AI acts, it shows its work quietly.

## Anti-references

- **Legacy HR software** (SAP SuccessFactors, Oracle HCM, Taleo): dense form grids, enterprise-grey, modal hell, "Save and Continue" everywhere. The old world.
- **Generic Tailwind SaaS templates**: blue gradient hero, three-column feature cards, testimonial strip, floating action buttons. Indistinguishable from 10,000 other startups.

## Design Principles

1. **The pipeline is the product.** Every design decision is measured against whether it makes the kanban faster or clearer. Secondary surfaces (settings, reports) defer to the pipeline's conventions.
2. **AI is assistive, never intrusive.** Scores, extracted fields, and enrichment appear in context without fanfare. No "✨ AI-powered" badges. The intelligence speaks through better data.
3. **Calm over noise.** One call to action per screen. Status badges that inform, not alarm. No competing highlights. Recruiters are already in high-stakes situations; the UI should lower their cognitive load.
4. **Precision over decoration.** Every visual element earns its place. Border-only hierarchy, flat surfaces, spacing as structure. If removing an element doesn't break comprehension, it should go.
5. **Speed is a feature.** Minimize clicks to key actions. Bulk operations are first-class. Keyboard-navigable wherever possible.

## Accessibility & Inclusion

Target WCAG 2.1 AA. High contrast for text on surfaces (minimum 4.5:1). All interactive elements reachable by keyboard. Motion: respect `prefers-reduced-motion` for animations and transitions.
