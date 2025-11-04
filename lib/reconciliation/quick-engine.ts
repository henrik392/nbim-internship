/**
 * Quick Reconciliation Engine - Milestone 1
 * Deterministic break detection (NO LLM)
 */

import type {
  BreakType,
  CustodyRecord,
  NBIMRecord,
  ReconciliationBreak,
  ReconciliationSummary,
} from "./types";

/**
 * Match NBIM and Custody records and detect breaks
 */
export function reconcile(
  nbimRecords: NBIMRecord[],
  custodyRecords: CustodyRecord[]
): ReconciliationBreak[] {
  const breaks: ReconciliationBreak[] = [];

  // Group records by event key
  const nbimByEvent = groupByEventKey(nbimRecords);
  const custodyByEvent = groupByEventKey(custodyRecords);

  // Get all unique event keys
  const allEventKeys = new Set([
    ...Object.keys(nbimByEvent),
    ...Object.keys(custodyByEvent),
  ]);

  for (const eventKey of allEventKeys) {
    const nbimRecs = nbimByEvent[eventKey] || [];
    const custodyRecs = custodyByEvent[eventKey] || [];

    // Match records by ISIN + Account
    for (const nbimRec of nbimRecs) {
      const custodyRec = findMatchingCustodyRecord(nbimRec, custodyRecs);

      if (!custodyRec) {
        // Missing record in custody
        breaks.push({
          event_key: eventKey,
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

      // Check for quantity breaks
      const quantityDiff = Math.abs(
        nbimRec.nominal_basis - custodyRec.nominal_basis
      );
      if (quantityDiff > 1) {
        // Tolerance of 1 share
        breaks.push({
          event_key: eventKey,
          instrument: nbimRec.instrument_name || nbimRec.isin,
          isin: nbimRec.isin,
          break_type: "QUANTITY",
          nbim_value: nbimRec.nominal_basis,
          custody_value: custodyRec.nominal_basis,
          difference: custodyRec.nominal_basis - nbimRec.nominal_basis,
          difference_pct: calculatePercentDiff(
            nbimRec.nominal_basis,
            custodyRec.nominal_basis
          ),
        });
      }

      // Check for tax rate breaks
      const taxDiff = Math.abs(nbimRec.wthtax_rate - custodyRec.tax_rate);
      if (taxDiff > 0.01) {
        // Tolerance of 0.01%
        breaks.push({
          event_key: eventKey,
          instrument: nbimRec.instrument_name || nbimRec.isin,
          isin: nbimRec.isin,
          break_type: "TAX_RATE",
          nbim_value: nbimRec.wthtax_rate,
          custody_value: custodyRec.tax_rate,
          difference: custodyRec.tax_rate - nbimRec.wthtax_rate,
          difference_pct: calculatePercentDiff(
            nbimRec.wthtax_rate,
            custodyRec.tax_rate
          ),
        });
      }

      // Check for amount breaks
      const amountDiff = Math.abs(
        nbimRec.net_amount_portfolio - custodyRec.net_amount_sc
      );
      const tolerance = Math.abs(nbimRec.net_amount_portfolio) * 0.0001; // 0.01% tolerance

      if (amountDiff > tolerance && amountDiff > 0.01) {
        // At least $0.01 difference
        breaks.push({
          event_key: eventKey,
          instrument: nbimRec.instrument_name || nbimRec.isin,
          isin: nbimRec.isin,
          break_type: "AMOUNT",
          nbim_value: nbimRec.net_amount_portfolio,
          custody_value: custodyRec.net_amount_sc,
          difference: custodyRec.net_amount_sc - nbimRec.net_amount_portfolio,
          difference_pct: calculatePercentDiff(
            nbimRec.net_amount_portfolio,
            custodyRec.net_amount_sc
          ),
        });
      }
    }

    // Check for records in custody but not in NBIM
    for (const custodyRec of custodyRecs) {
      const nbimRec = findMatchingNBIMRecord(custodyRec, nbimRecs);
      if (!nbimRec) {
        breaks.push({
          event_key: eventKey,
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

  for (const breakItem of breaks) {
    breaksByType[breakItem.break_type]++;
  }

  return {
    total_events: uniqueEvents.size,
    events_with_breaks: eventsWithBreaks.size,
    total_breaks: breaks.length,
    breaks_by_severity: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    },
    breaks_by_type: breaksByType,
    total_cost: 0,
    total_tokens: 0,
  };
}

// Helper functions

function groupByEventKey<T extends { coac_event_key: string }>(
  records: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  for (const record of records) {
    const key = record.coac_event_key;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(record);
  }
  return grouped;
}

function findMatchingCustodyRecord(
  nbimRec: NBIMRecord,
  custodyRecs: CustodyRecord[]
): CustodyRecord | undefined {
  // Match by ISIN
  return custodyRecs.find((c) => c.isin === nbimRec.isin);
}

function findMatchingNBIMRecord(
  custodyRec: CustodyRecord,
  nbimRecs: NBIMRecord[]
): NBIMRecord | undefined {
  // Match by ISIN
  return nbimRecs.find((n) => n.isin === custodyRec.isin);
}

function calculatePercentDiff(value1: number, value2: number): number {
  if (value1 === 0) return value2 === 0 ? 0 : 100;
  return ((value2 - value1) / Math.abs(value1)) * 100;
}
