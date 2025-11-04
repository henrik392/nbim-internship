"use server";

/**
 * Server Actions for Reconciliation - Milestone 2
 * Handles LLM analysis on the server side
 */

import { createGatewayProvider } from "@ai-sdk/gateway";
import { generateObject } from "ai";
import { z } from "zod";
import type { ReconciliationBreak } from "./types";

// AI Gateway setup (uses environment variable AI_GATEWAY_API_KEY)
const gateway = createGatewayProvider({
  baseURL: "https://gateway.ai.vercel.com/api",
});

// Use GPT-4o-mini for cost efficiency
const model = gateway.languageModel("gpt-4o-mini");

// Analysis schema - matches the "Evaluate" box in the diagram
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
 * Analyze a single break using LLM (Server Action)
 */
export async function analyzeBreakWithLLM(
  breakItem: ReconciliationBreak
): Promise<{
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
1. **Severity**: Assess financial impact (CRITICAL for >$100K or >50%, HIGH for >$10K or >10%, MEDIUM for >$1K, LOW otherwise)
2. **Root Cause**: Identify the most likely reason (securities lending, settlement timing, tax treaty, data error, FX rounding, split booking, etc.)
3. **Explanation**: Explain what likely happened and why
4. **Recommendation**: Provide specific, actionable next steps
5. **Confidence**: Rate your confidence (0.7-0.95 typical range)
6. **Suggested Remediation**: Choose the programmatic remediation path:
   - "auto_resolve": For FX rounding differences (<0.1% variance in amounts)
   - "data_correction": For date mismatches or minor data entry errors
   - "create_entry": For missing records that should exist
   - "escalation": For large/complex breaks requiring human review

Context:
- This is a real-money dividend reconciliation for NBIM (Norwegian sovereign wealth fund)
- Quantity breaks often indicate securities lending
- Tax rate breaks may involve treaty applications
- Amount breaks can be secondary effects of quantity/tax differences
- CRITICAL or HIGH severity should typically route to "escalation"`;

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
        promptTokens: usage?.promptTokens || 0,
        completionTokens: usage?.completionTokens || 0,
        totalTokens: usage?.totalTokens || 0,
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
 * GPT-4o-mini pricing: $0.150 per 1M input tokens, $0.600 per 1M output tokens
 * Note: Made async to comply with Server Actions requirement
 */
export async function calculateCost(usage: {
  promptTokens: number;
  completionTokens: number;
}): Promise<number> {
  const inputCost = (usage.promptTokens * 0.15) / 1_000_000;
  const outputCost = (usage.completionTokens * 0.6) / 1_000_000;
  return inputCost + outputCost;
}
