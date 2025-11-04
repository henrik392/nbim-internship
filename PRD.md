# Product Requirements Document: LLM-Powered Dividend Reconciliation System

**Version:** 1.0
**Date:** 2025-11-04
**Target:** NBIM Internship Interview Assessment
**Timeline:** 1 day development + 8-minute presentation

---

## Executive Summary

Build a working prototype that demonstrates how LLMs can transform NBIM's dividend reconciliation workflow by intelligently classifying discrepancies, assessing severity, and recommending remediation actions—while keeping all financial calculations deterministic.

---

## Problem Statement

**Current State:**
- NBIM processes ~8,000 dividend events annually across 9,000+ equity holdings
- Manual reconciliation between internal bookings and custodian data is time-consuming and error-prone
- No intelligent prioritization of breaks by severity or root cause

**Goal:**
- Automate break detection and classification using LLM reasoning
- Provide actionable insights for operations team
- Demonstrate feasibility of agent-based financial workflows

---

## Success Criteria

### MVP Must-Haves (Deliverable #1: Working Prototype)
- ✅ Upload 2 CSV files via drag-and-drop
- ✅ Automated reconciliation with deterministic calculations
- ✅ LLM-powered severity classification (Critical/High/Medium/Low)
- ✅ Streaming summary with recommendations
- ✅ Complete analysis of all 3 test events
- ✅ Stay within $15 LLM budget

### Nice-to-Haves (If Time Permits)
- Interactive results table with filtering
- Export reconciliation report to CSV
- Confidence scores on LLM classifications
- Diff visualization for discrepancies

---

## User Flow

```
1. Landing Page
   └─ Upload CSV files (drag & drop)

2. Data Validation
   └─ Show preview of parsed data
   └─ Display any data quality issues

3. Reconciliation Processing
   └─ Match records by COAC_EVENT_KEY + identifiers
   └─ Calculate discrepancies (code-based, no LLM)
   └─ Display all breaks in summary table

4. LLM Analysis (Streaming)
   └─ For each break:
       • Classify discrepancy type
       • Assess severity/financial impact
       • Identify probable root cause
       • Suggest remediation action

5. Summary Report
   └─ Aggregate statistics
   └─ Prioritized action items
   └─ Total cost & token usage
```

---

## Technical Architecture

### Tech Stack
- **Framework:** Next.js 15 App Router (React Server Components)
- **LLM Integration:** Vercel AI SDK v5 (`streamObject` for structured outputs)
- **Model:** GPT-4o-mini (cost-efficient: ~$0.15/1M input tokens)
- **CSV Parsing:** papaparse (already in stack)
- **UI:** shadcn/ui + Tailwind CSS
- **Validation:** Zod schemas for type safety

### File Structure
```
/app/reconciliation/
  page.tsx                    # Main reconciliation interface
  actions.ts                  # Server actions for LLM calls

/lib/reconciliation/
  csv-parser.ts               # Parse and validate CSV files
  reconciliation-engine.ts    # Core matching & calculation logic
  types.ts                    # TypeScript types for data models
  schemas.ts                  # Zod schemas for validation

/components/reconciliation/
  upload-zone.tsx             # Drag & drop CSV uploader
  results-table.tsx           # Display reconciliation breaks
  streaming-analysis.tsx      # Real-time LLM output
  summary-report.tsx          # Final recommendations
```

---

## Data Models

### NBIM Record
```typescript
{
  coac_event_key: string
  isin: string
  nominal_basis: number
  gross_amount_portfolio: number
  net_amount_portfolio: number
  wthtax_rate: number
  // ... other fields
}
```

### Custody Record
```typescript
{
  coac_event_key: string
  isin: string
  nominal_basis: number
  holding_quantity: number
  loan_quantity: number
  gross_amount: number
  net_amount_sc: number (settlement currency)
  tax_rate: number
  // ... other fields
}
```

### Reconciliation Break
```typescript
{
  event_key: string
  instrument: string
  break_type: 'QUANTITY' | 'AMOUNT' | 'TAX_RATE' | 'MISSING_RECORD'
  nbim_value: number | null
  custody_value: number | null
  difference: number
  difference_pct: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  root_cause: string (LLM-generated)
  recommendation: string (LLM-generated)
  confidence: number (0-1)
}
```

---

## Reconciliation Logic (Deterministic)

### Matching Rules
1. Join on `COAC_EVENT_KEY` (primary)
2. Verify `ISIN` matches
3. Handle split bookings (multiple NBIM records per event)

### Break Detection
```typescript
// Quantity breaks
if (nbim.nominal_basis !== custody.nominal_basis):
  flag as QUANTITY_MISMATCH

// Amount breaks (allow 0.01% tolerance for rounding)
if (abs(nbim.net_amount_portfolio - custody.net_amount_sc) > threshold):
  flag as AMOUNT_MISMATCH

// Tax rate breaks
if (nbim.wthtax_rate !== custody.tax_rate):
  flag as TAX_RATE_MISMATCH

// Missing records
if (event in NBIM but not in CUSTODY):
  flag as MISSING_IN_CUSTODY
```

### Known Issues in Test Data
1. **Event 950123456 (Apple):** ✓ Clean match
2. **Event 960789012 (Samsung):**
   - Securities lending (8% loaned out)
   - Tax rate discrepancy (22% vs 20%)
   - Net amount variance (holdings vs bookings)
3. **Event 970456789 (Nestle):**
   - Split across 3 bank accounts
   - Account 823456790: Quantity mismatch (15K vs 30K nominal)
   - Account 823456791: Position mismatch (10K booked, 12K held)

---

## LLM Integration Strategy

### Prompt Architecture

**System Prompt:**
```
You are a financial operations analyst specializing in dividend reconciliation for NBIM,
a sovereign wealth fund managing equity portfolios. Your role is to analyze discrepancies
between internal booking systems and custodian reports.

Key principles:
- Never perform calculations (all numbers are pre-calculated)
- Focus on root cause analysis and business impact
- Consider operational workflows, market conventions, and custody practices
- Provide actionable recommendations
```

**User Prompt per Break:**
```
Analyze this dividend reconciliation break:

Instrument: {name} ({isin})
Event Date: {ex_date}
Custodian: {custodian}

Discrepancy Details:
- Break Type: {break_type}
- NBIM Value: {nbim_value}
- Custody Value: {custody_value}
- Difference: {difference} ({difference_pct}%)

Context:
{additional_context from CSV fields: lending %, cross-currency, restitution, etc.}

Provide:
1. Severity classification (CRITICAL/HIGH/MEDIUM/LOW) based on financial impact
2. Most likely root cause (choose from: Securities Lending, Data Entry Error,
   Settlement Timing, FX Rate Mismatch, Custody Process Issue, Tax Withholding, Other)
3. Detailed explanation (2-3 sentences)
4. Recommended action (specific next steps)
5. Confidence level (0-1) in this assessment
```

### Structured Output Schema
```typescript
const BreakAnalysisSchema = z.object({
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  root_cause: z.string(),
  explanation: z.string(),
  recommendation: z.string(),
  confidence: z.number().min(0).max(1)
})
```

### Streaming Implementation
```typescript
import { streamObject } from 'ai'
import { openai } from '@ai-sdk/openai'

const result = await streamObject({
  model: openai('gpt-4o-mini'),
  schema: BreakAnalysisSchema,
  system: systemPrompt,
  prompt: userPrompt,
  temperature: 0.3 // Lower for consistency
})

// Stream to client via Server Actions
for await (const chunk of result.partialObjectStream) {
  // Real-time updates to UI
}
```

---

## Architecture Vision (Deliverable #2)

### Multi-Agent Supervisor Pattern

```
┌─────────────────────────────────────────────┐
│         Human Operator Interface            │
└─────────────────┬───────────────────────────┘
                  │
         ┌────────▼────────┐
         │  Supervisor      │
         │  Orchestrator    │
         └────────┬─────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐   ┌────▼────┐   ┌───▼────┐
│ Data  │   │ Recon   │   │ LLM    │
│ Agent │   │ Engine  │   │ Agents │
└───┬───┘   └────┬────┘   └───┬────┘
    │            │             │
    │            │      ┌──────┴──────┐
    │            │      │             │
    │            │  ┌───▼───┐   ┌────▼─────┐
    │            │  │Class. │   │Severity  │
    │            │  │Agent  │   │Agent     │
    │            │  └───┬───┘   └────┬─────┘
    │            │      │             │
    │            │  ┌───▼─────────────▼──┐
    │            │  │  Root Cause        │
    │            │  │  Analyzer Agent    │
    │            │  └────┬───────────────┘
    │            │       │
    │            │  ┌────▼──────────────┐
    │            │  │  Remediation      │
    │            │  │  Advisor Agent    │
    │            │  └────┬──────────────┘
    │            │       │
┌───▼────────────▼───────▼──────────────┐
│     Audit Trail & Action Logger       │
└───────────────────────────────────────┘
```

### Agent Responsibilities

**1. Data Validation Agent**
- Parse and validate CSV structure
- Check for missing required fields
- Normalize data formats (dates, currencies)
- Flag data quality issues

**2. Reconciliation Engine** (Deterministic)
- Match records across systems
- Calculate all discrepancies
- Apply business rules (tolerances, split bookings)
- Generate break reports

**3. Classification Agent**
- Categorize break types (quantity, amount, tax, timing)
- Tag with relevant attributes (lending, FX, restitution)

**4. Severity Assessment Agent**
- Calculate financial impact (absolute $ amount)
- Consider portfolio context (% of position)
- Apply risk weighting (asset class, counterparty)
- Assign priority level

**5. Root Cause Analysis Agent**
- Pattern recognition across historical breaks
- Cross-reference with market events, corporate actions
- Identify systemic vs. isolated issues

**6. Remediation Advisor Agent**
- Map break types to standard workflows
- Generate specific action items with owners
- Estimate resolution time
- Suggest preventive measures

### Safeguards & Governance

**Human-in-the-Loop Triggers:**
- Any CRITICAL severity break
- Financial impact > $100K
- LLM confidence < 0.7
- Novel break patterns

**Audit Requirements:**
- Log all LLM prompts and responses
- Version control on prompt templates
- Track accuracy metrics over time
- Regular model revalidation

**Data Security:**
- No PII in LLM prompts
- Option to anonymize instrument names
- On-premise deployment option for sensitive data

---

## Risk Assessment (Deliverable #3)

### Opportunities
✅ **Efficiency:** Reduce manual review time from hours to minutes
✅ **Accuracy:** Consistent classification vs. human variability
✅ **Scalability:** Handle 8,000 events/year without headcount increase
✅ **Insights:** Pattern detection across portfolio (systemic issues)
✅ **Training:** Onboard new analysts faster with AI-assisted learning

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM hallucination on financial amounts | HIGH | Never let LLM calculate—only reason about pre-calculated values |
| Model drift/degradation over time | MEDIUM | Continuous monitoring, human validation loop, version control |
| Over-reliance on AI decisions | MEDIUM | Always require human approval for high-impact actions |
| API cost explosion at scale | MEDIUM | Budget caps, rate limiting, use smaller models for classification |
| Data privacy (sending to external APIs) | HIGH | On-premise deployment option, data anonymization, contractual DPA |
| Prompt injection attacks | LOW | Strict input validation, sandboxed execution |
| Regulatory compliance (audit trail) | HIGH | Comprehensive logging, explainability requirements |

### Innovative Use Cases

**Beyond Break Detection:**
1. **Predictive Analytics:** Forecast high-risk events before they occur
2. **Natural Language Queries:** "Show me all Samsung dividend issues this quarter"
3. **Automated Email Generation:** Draft follow-up messages to custodians
4. **Knowledge Base:** Build searchable repository of past resolutions
5. **Regulatory Reporting:** Auto-generate variance explanations for auditors
6. **Training Simulator:** Create realistic scenarios for analyst onboarding

---

## Development Plan (1 Day Sprint)

### Phase 1: Core Reconciliation (3 hours)
- [ ] Set up clean Next.js app structure
- [ ] Implement CSV parsing with papaparse
- [ ] Build reconciliation engine (matching + calculations)
- [ ] Test against provided datasets

### Phase 2: UI Components (2 hours)
- [ ] Create upload zone with drag-and-drop
- [ ] Build results table component
- [ ] Add streaming analysis display
- [ ] Design summary report view

### Phase 3: LLM Integration (2 hours)
- [ ] Configure AI SDK with OpenAI
- [ ] Write prompt templates
- [ ] Implement `streamObject` with Zod schemas
- [ ] Test with all 3 events

### Phase 4: Polish & Testing (1 hour)
- [ ] Add loading states and error handling
- [ ] Track token usage and cost
- [ ] Test end-to-end flow
- [ ] Prepare demo data

### Phase 5: Documentation (1 hour)
- [ ] Document prompt engineering approach
- [ ] Write architecture vision document
- [ ] Prepare presentation slides
- [ ] Practice 8-minute demo

---

## Presentation Structure (8 minutes)

**1. Problem Context (1 min)**
- NBIM's reconciliation challenge
- Why LLMs are uniquely suited for this

**2. Live Demo (4 min)**
- Upload CSVs → Show 3 events processed
- Walk through break detection
- Display LLM streaming analysis
- Highlight severity classification + recommendations

**3. Architecture Vision (2 min)**
- Multi-agent supervisor pattern
- Safeguards and human-in-the-loop
- Scalability from 3 events to 8,000/year

**4. Innovation & Next Steps (1 min)**
- Most creative use cases identified
- Risk mitigation strategies
- Practical roadmap for production deployment

---

## Out of Scope (For MVP)

- Historical data analysis
- Integration with real booking systems
- Email notifications
- Role-based access control
- Multi-language support
- Mobile responsiveness
- Advanced charting/dashboards
- Automated remediation actions

---

## Success Metrics

**For Interview Assessment:**
- ✅ Working prototype processes all 3 test events correctly
- ✅ LLM provides reasonable severity classifications
- ✅ Total cost < $1 (well under $15 budget)
- ✅ Demo runs smoothly without crashes
- ✅ Clear articulation of where LLMs add value vs. where they shouldn't be used

**For Production (Future):**
- 90% reduction in manual review time
- <5% false positive rate on severity classification
- 95% agreement with human analyst on prioritization
- Zero incidents of incorrect financial calculations
- <$0.10 LLM cost per event processed

---

## Appendix: Technical Decisions

### Why GPT-4o-mini?
- Cost: ~$0.15/1M tokens (vs. $2.50 for GPT-4)
- Speed: ~10x faster response times
- Quality: Sufficient for classification tasks
- Budget: Can analyze 100+ breaks for <$5

### Why Structured Outputs?
- Guarantees valid JSON (no parsing errors)
- Type safety with Zod schemas
- Easier to test and validate
- Better UX with predictable response format

### Why Server Actions?
- Secure API key handling (no client exposure)
- Streaming support out of the box
- Simplified data flow (no separate API routes)
- Better TypeScript integration

---

**Document Owner:** Henrik Kvamme
**Last Updated:** 2025-11-04
**Status:** Ready for Development
