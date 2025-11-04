import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSummary, reconcile } from "@/lib/reconciliation/quick-engine";
import {
  parseCustodyFile,
  parseNBIMFile,
} from "@/lib/reconciliation/quick-parser";
import type { ReconciliationBreak } from "@/lib/reconciliation/types";

// OpenRouter setup - uses OPEN_ROUTER_API_KEY from environment
const openrouter = createOpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

// Using GPT-4o-mini for cost-effective analysis
const model = openrouter("openai/gpt-4o-mini");

// Analysis schema
const AnalysisSchema = z.object({
  severity: z
    .enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])
    .describe("Financial impact severity level"),
  root_cause: z
    .string()
    .describe(
      "Most likely cause of this discrepancy (e.g., securities lending, tax treaty, settlement timing)"
    ),
  explanation: z
    .string()
    .describe("2-3 sentence detailed explanation of what happened and why"),
  recommendation: z
    .string()
    .describe("Specific actionable next steps to resolve this break"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence level in this analysis (0.7-0.95 typical)"),
  suggested_remediation: z
    .enum(["auto_resolve", "data_correction", "create_entry", "escalation"])
    .describe(
      "Programmatic remediation type: auto_resolve for FX rounding, data_correction for date issues, create_entry for missing records, escalation for large/complex breaks"
    ),
});

/**
 * POST /api/reconciliation/analyze
 * Accepts two CSV files (nbim and custody), performs reconciliation,
 * and analyzes ALL breaks with LLM (following architecture diagram)
 */
export async function POST(request: Request) {
  try {
    // Parse form data
    const formData = await request.formData();
    const nbimFile = formData.get("nbimFile") as File;
    const custodyFile = formData.get("custodyFile") as File;

    if (!nbimFile || !custodyFile) {
      return NextResponse.json(
        { error: "Both NBIM and Custody files are required" },
        { status: 400 }
      );
    }

    // Parse CSV files
    const nbimRecords = await parseNBIMFile(nbimFile);
    const custodyRecords = await parseCustodyFile(custodyFile);

    // Run reconciliation engine (deterministic - black box in diagram)
    const detectedBreaks = reconcile(nbimRecords, custodyRecords);

    if (detectedBreaks.length === 0) {
      // No breaks found - perfect reconciliation!
      const summaryStats = generateSummary(detectedBreaks, nbimRecords);
      return NextResponse.json({
        breaks: [],
        summary: summaryStats,
      });
    }

    // Analyze ALL breaks with LLM (green box in diagram)
    // In production, you might want to limit this or batch it
    const breaksWithAnalysis: ReconciliationBreak[] = [];
    let totalCost = 0;
    let totalTokens = 0;

    for (const breakItem of detectedBreaks) {
      try {
        const analysis = await analyzeBreakWithLLM(breakItem);

        breaksWithAnalysis.push({
          ...breakItem,
          ...analysis,
        });

        // Accumulate costs
        totalCost += calculateCost(analysis.usage);
        totalTokens += analysis.usage.totalTokens;
      } catch (llmError) {
        console.warn(
          `LLM analysis failed for break ${breakItem.event_key} (continuing):`,
          llmError instanceof Error ? llmError.message : llmError
        );
        // Add break without LLM analysis
        breaksWithAnalysis.push(breakItem);
      }
    }

    // Generate summary with cost
    const summaryStats = generateSummary(breaksWithAnalysis, nbimRecords);
    summaryStats.total_cost = totalCost;
    summaryStats.total_tokens = totalTokens;

    // Update severity counts based on LLM analysis
    const breaksBySeverity = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    for (const breakItem of breaksWithAnalysis) {
      if (breakItem.severity) {
        breaksBySeverity[breakItem.severity]++;
      }
    }

    summaryStats.breaks_by_severity = breaksBySeverity;

    return NextResponse.json({
      breaks: breaksWithAnalysis,
      summary: summaryStats,
    });
  } catch (error) {
    console.error("Reconciliation analysis error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process files",
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze a single break using LLM
 */
async function analyzeBreakWithLLM(breakItem: ReconciliationBreak): Promise<{
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  root_cause: string;
  explanation: string;
  recommendation: string;
  confidence: number;
  suggested_remediation:
    | "auto_resolve"
    | "data_correction"
    | "create_entry"
    | "escalation";
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  const prompt = `Analyze this dividend reconciliation discrepancy:

**Event:** ${breakItem.event_key}
**Instrument:** ${breakItem.instrument} (ISIN: ${breakItem.isin})
**Break Type:** ${breakItem.break_type}

**Discrepancy Details:**
- NBIM Value: ${breakItem.nbim_value !== null ? breakItem.nbim_value.toLocaleString() : "N/A"}
- Custody Value: ${breakItem.custody_value !== null ? breakItem.custody_value.toLocaleString() : "N/A"}
- Difference: ${breakItem.difference.toLocaleString()} (${breakItem.difference_pct.toFixed(1)}%)

Provide your analysis following these guidelines:
1. **Severity**: Assess financial impact (amounts in NOK - Norwegian Kroner)
   - CRITICAL: 
     * Quantity differences >50%
     * Amount >1M NOK or >50%
     * Tax rate differences: Calculate financial impact (gross amount × tax rate difference ÷ 100)
       - If tax impact >100K NOK → CRITICAL
   - HIGH: 
     * Quantity differences 10-50%
     * Amount 100K-1M NOK or 10-50%
     * Tax rate differences with impact 10K-100K NOK (even small % point differences on large positions)
   - MEDIUM: 
     * Quantity differences 1-10%
     * Amount 10K-100K NOK or 1-10%
     * Tax rate differences with impact 1K-10K NOK
   - LOW: Small differences <1%, tax impact <1K NOK, likely rounding

2. **Root Cause**: Identify the most likely reason
   - Securities lending (quantity discrepancies)
   - Settlement timing (date-related)
   - Tax treaty application (tax rate differences)
   - Data error (obvious mistakes)
   - FX rounding (small amount differences <0.1%)
   - Split booking (multiple accounts)

3. **Explanation**: Explain what likely happened and why

4. **Recommendation**: Provide specific, actionable next steps

5. **Confidence**: Rate your confidence (0.70-0.95 typical range)

6. **Suggested Remediation**: Choose the programmatic remediation path:
   - "auto_resolve": FX rounding differences (<0.1% variance in amounts)
   - "data_correction": Date mismatches or minor data entry errors
   - "create_entry": Missing records that should exist
   - "escalation": Large/complex breaks requiring human review

Context:
- This is a real-money dividend reconciliation for NBIM (Norwegian sovereign wealth fund)
- All amounts are in NOK (Norwegian Kroner) - NBIM's portfolio currency
- Quantity breaks often indicate securities lending, split bookings, or data errors
- Large quantity discrepancies (>50%) are always CRITICAL and require immediate investigation
- **Tax rate breaks**: Even small % point differences have LARGE financial impact on big positions
  * Example: 2pp difference on 100M NOK position = 2M NOK impact → HIGH or CRITICAL
  * Always calculate: (gross amount in NOK) × (tax rate difference ÷ 100) to assess severity
- Amount breaks can be secondary effects of quantity/tax differences
- CRITICAL severity must always route to "escalation"`;

  try {
    const { object, usage } = await generateObject({
      model,
      schema: AnalysisSchema,
      system: `You are a senior financial operations analyst specializing in dividend reconciliation for institutional asset managers.

Key principles:
- Never perform calculations (all numbers are pre-calculated and accurate)
- Focus on root cause analysis and business context
- Consider: securities lending, tax treaties, settlement timing, FX differences, split bookings
- Be specific and actionable in recommendations
- Typical confidence range: 0.70-0.95 (rarely below or above)`,
      prompt,
      temperature: 0.3, // Lower temperature for consistent analysis
    });

    return {
      ...object,
      usage: {
        promptTokens: usage?.inputTokens ?? 0,
        completionTokens: usage?.outputTokens ?? 0,
        totalTokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
      },
    };
  } catch (error) {
    console.error("LLM analysis failed:", error);
    throw new Error(
      `Failed to analyze break: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Calculate LLM cost based on token usage
 * OpenRouter pricing for openai/gpt-4o-mini: $0.150 per 1M input tokens, $0.600 per 1M output tokens
 */
function calculateCost(usage: {
  promptTokens: number;
  completionTokens: number;
}): number {
  const inputCost = (usage.promptTokens * 0.15) / 1_000_000;
  const outputCost = (usage.completionTokens * 0.6) / 1_000_000;
  return inputCost + outputCost;
}
