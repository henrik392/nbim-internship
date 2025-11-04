/**
 * Quick Reconciliation Engine - Fixed for proper matching
 * Matches NBIM and Custody records by ISIN + Bank Account
 * Detects ALL discrepancies per matched pair
 */

import type {
  CustodyRecord,
  NBIMRecord,
  ReconciliationBreak,
  ReconciliationSummary,
} from "./types";

/**
 * Match NBIM and Custody records and detect breaks
 * Algorithm:
 * 1. Match records by Event Key + ISIN + Bank Account
 * 2. For each matched pair, check: Quantity, Tax Rate, Amount
 * 3. For unmatched records, create MISSING_RECORD breaks
 */
export function reconcile(
  nbimRecords: NBIMRecord[],
  custodyRecords: CustodyRecord[]
): ReconciliationBreak[] {
  const breaks: ReconciliationBreak[] = [];

  // Build lookup maps for custody records
  const custodyMap = new Map<string, CustodyRecord>();
  const custodyUsed = new Set<string>();

  for (const custodyRec of custodyRecords) {
    const key = makeMatchKey(
      custodyRec.coac_event_key,
      custodyRec.isin,
      custodyRec.bank_account || ""
    );
    custodyMap.set(key, custodyRec);
  }

  // Process each NBIM record
  for (const nbimRec of nbimRecords) {
    const matchKey = makeMatchKey(
      nbimRec.coac_event_key,
      nbimRec.isin,
      nbimRec.account_number || ""
    );

    const custodyRec = custodyMap.get(matchKey);

    if (!custodyRec) {
      // Missing in custody - create a single MISSING_RECORD break
      breaks.push({
        event_key: nbimRec.coac_event_key,
        instrument: nbimRec.instrument_name || nbimRec.isin,
        isin: nbimRec.isin,
        break_type: "MISSING_RECORD",
        nbim_value: nbimRec.nominal_basis,
        custody_value: null,
        difference: nbimRec.nominal_basis,
        difference_pct: 100,
      });
      continue;
    }

    // Mark custody record as matched
    custodyUsed.add(matchKey);

    // CHECK 1: Quantity (nominal basis)
    // Difference = NBIM - Custody (from NBIM's perspective)
    const quantityDiff = nbimRec.nominal_basis - custodyRec.nominal_basis;
    const quantityAbsDiff = Math.abs(quantityDiff);

    if (quantityAbsDiff > 1) {
      // Tolerance: 1 share
      breaks.push({
        event_key: nbimRec.coac_event_key,
        instrument: nbimRec.instrument_name || nbimRec.isin,
        isin: nbimRec.isin,
        break_type: "QUANTITY",
        nbim_value: nbimRec.nominal_basis,
        custody_value: custodyRec.nominal_basis,
        difference: quantityDiff,
        difference_pct: calculatePercentDiff(
          nbimRec.nominal_basis,
          custodyRec.nominal_basis
        ),
      });
    }

    // CHECK 2: Tax Rate
    // Difference = NBIM - Custody
    const taxDiff = nbimRec.wthtax_rate - custodyRec.tax_rate;
    const taxAbsDiff = Math.abs(taxDiff);

    if (taxAbsDiff > 0.01) {
      // Tolerance: 0.01%
      breaks.push({
        event_key: nbimRec.coac_event_key,
        instrument: nbimRec.instrument_name || nbimRec.isin,
        isin: nbimRec.isin,
        break_type: "TAX_RATE",
        nbim_value: nbimRec.wthtax_rate,
        custody_value: custodyRec.tax_rate,
        difference: taxDiff,
        difference_pct: calculatePercentDiff(
          nbimRec.wthtax_rate,
          custodyRec.tax_rate
        ),
      });
    }

    // CHECK 3: Amount (compare in same currency - use quotation currency)
    // NBIM has net_amount_quotation (in original currency)
    // Custody has net_amount_qc (in quotation currency)
    // Both are in the same currency (quotation currency like KRW, USD, CHF)
    // Difference = NBIM - Custody
    const nbimAmount = nbimRec.net_amount_quotation || 0;
    const custodyAmount = custodyRec.net_amount_qc;

    const amountDiff = nbimAmount - custodyAmount;
    const amountAbsDiff = Math.abs(amountDiff);

    // Tolerance: 0.01% or $1, whichever is larger
    const tolerance = Math.max(Math.abs(nbimAmount) * 0.0001, 1.0);

    if (amountAbsDiff > tolerance) {
      breaks.push({
        event_key: nbimRec.coac_event_key,
        instrument: nbimRec.instrument_name || nbimRec.isin,
        isin: nbimRec.isin,
        break_type: "AMOUNT",
        nbim_value: nbimAmount,
        custody_value: custodyAmount,
        difference: amountDiff,
        difference_pct: calculatePercentDiff(nbimAmount, custodyAmount),
      });
    }
  }

  // Check for custody records not in NBIM
  for (const custodyRec of custodyRecords) {
    const matchKey = makeMatchKey(
      custodyRec.coac_event_key,
      custodyRec.isin,
      custodyRec.bank_account || ""
    );

    if (!custodyUsed.has(matchKey)) {
      breaks.push({
        event_key: custodyRec.coac_event_key,
        instrument: custodyRec.instrument_name || custodyRec.isin,
        isin: custodyRec.isin,
        break_type: "MISSING_RECORD",
        nbim_value: null,
        custody_value: custodyRec.nominal_basis,
        difference: custodyRec.nominal_basis,
        difference_pct: 100,
      });
    }
  }

  return breaks;
}

/**
 * Generate summary statistics
 */
export function generateSummary(
  breaks: ReconciliationBreak[],
  nbimRecords: NBIMRecord[]
): ReconciliationSummary {
  const uniqueEvents = new Set(nbimRecords.map((r) => r.coac_event_key));
  const eventsWithBreaks = new Set(breaks.map((b) => b.event_key));

  // Count by type
  const breaksByType = {
    QUANTITY: 0,
    AMOUNT: 0,
    TAX_RATE: 0,
    MISSING_RECORD: 0,
  };

  const breaksBySeverity = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const breakItem of breaks) {
    breaksByType[breakItem.break_type]++;

    // Count severity if present (from LLM analysis)
    if (breakItem.severity) {
      breaksBySeverity[breakItem.severity]++;
    }
  }

  return {
    total_events: uniqueEvents.size,
    events_with_breaks: eventsWithBreaks.size,
    total_breaks: breaks.length,
    breaks_by_severity: breaksBySeverity,
    breaks_by_type: breaksByType,
    total_cost: 0,
    total_tokens: 0,
  };
}

// Helper functions

/**
 * Create a unique matching key for NBIM-Custody pairing
 * Format: "EventKey|ISIN|BankAccount"
 */
function makeMatchKey(
  eventKey: string,
  isin: string,
  bankAccount: string
): string {
  return `${eventKey}|${isin}|${bankAccount}`;
}

/**
 * Calculate percentage difference
 */
function calculatePercentDiff(value1: number, value2: number): number {
  if (value1 === 0 && value2 === 0) {
    return 0;
  }
  if (value1 === 0) {
    return 100;
  }
  return ((value2 - value1) / Math.abs(value1)) * 100;
}
