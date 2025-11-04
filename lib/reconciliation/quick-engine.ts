/**
 * Quick Reconciliation Engine - Fixed for event-level aggregation
 * Aggregates split bookings by Event + ISIN, then compares totals
 * This handles cases where one dividend event is split across multiple bank accounts
 */

import type {
  CustodyRecord,
  NBIMRecord,
  ReconciliationBreak,
  ReconciliationSummary,
} from "./types";

/**
 * Aggregated event data (summed across all accounts for the same event)
 */
type AggregatedEvent = {
  event_key: string;
  isin: string;
  instrument_name: string;
  ex_date: string;
  total_nominal_basis: number;
  max_gross_amount: number;
  total_net_amount: number;
  tax_rate: number; // Use the rate from the largest booking
  account_count: number;
};

/**
 * Match NBIM and Custody records and detect breaks
 * Algorithm:
 * 1. Aggregate records by Event Key + ISIN (sum nominal basis across accounts)
 * 2. For each matched event pair, check: Quantity, Tax Rate, Amount
 * 3. For unmatched events, create MISSING_RECORD breaks
 */
export function reconcile(
  nbimRecords: NBIMRecord[],
  custodyRecords: CustodyRecord[]
): ReconciliationBreak[] {
  const breaks: ReconciliationBreak[] = [];

  // Aggregate records by Event Key + ISIN
  const nbimAggregated = aggregateByEvent(nbimRecords);
  const custodyAggregated = aggregateCustodyByEvent(custodyRecords);

  // Get all unique event keys
  const allEventKeys = new Set([
    ...Object.keys(nbimAggregated),
    ...Object.keys(custodyAggregated),
  ]);

  for (const eventKey of allEventKeys) {
    const nbimEvent = nbimAggregated[eventKey];
    const custodyEvent = custodyAggregated[eventKey];

    if (!custodyEvent) {
      // Missing in custody
      breaks.push({
        event_key: nbimEvent.event_key,
        instrument: nbimEvent.instrument_name,
        isin: nbimEvent.isin,
        break_type: "MISSING_RECORD",
        nbim_value: nbimEvent.total_nominal_basis,
        custody_value: null,
        difference: nbimEvent.total_nominal_basis,
        difference_pct: 100,
      });
      continue;
    }

    if (!nbimEvent) {
      // Missing in NBIM
      breaks.push({
        event_key: custodyEvent.event_key,
        instrument: custodyEvent.instrument_name,
        isin: custodyEvent.isin,
        break_type: "MISSING_RECORD",
        nbim_value: null,
        custody_value: custodyEvent.total_nominal_basis,
        difference: custodyEvent.total_nominal_basis,
        difference_pct: 100,
      });
      continue;
    }

    // CHECK 1: Quantity (total nominal basis)
    // Difference = NBIM - Custody (from NBIM's perspective)
    const quantityDiff = nbimEvent.total_nominal_basis - custodyEvent.total_nominal_basis;
    const quantityAbsDiff = Math.abs(quantityDiff);

    if (quantityAbsDiff > 1) {
      // Tolerance: 1 share
      breaks.push({
        event_key: nbimEvent.event_key,
        instrument: nbimEvent.instrument_name,
        isin: nbimEvent.isin,
        break_type: "QUANTITY",
        nbim_value: nbimEvent.total_nominal_basis,
        custody_value: custodyEvent.total_nominal_basis,
        difference: quantityDiff,
        difference_pct: calculatePercentDiff(
          nbimEvent.total_nominal_basis,
          custodyEvent.total_nominal_basis
        ),
      });
    }

    // CHECK 2: Tax Rate
    // Difference = NBIM - Custody
    const taxDiff = nbimEvent.tax_rate - custodyEvent.tax_rate;
    const taxAbsDiff = Math.abs(taxDiff);

    if (taxAbsDiff > 0.01) {
      // Tolerance: 0.01%
      breaks.push({
        event_key: nbimEvent.event_key,
        instrument: nbimEvent.instrument_name,
        isin: nbimEvent.isin,
        break_type: "TAX_RATE",
        nbim_value: nbimEvent.tax_rate,
        custody_value: custodyEvent.tax_rate,
        difference: taxDiff,
        difference_pct: calculatePercentDiff(
          nbimEvent.tax_rate,
          custodyEvent.tax_rate
        ),
      });
    }

    // CHECK 3: Amount (compare total net amounts in quotation currency)
    // Both aggregated amounts are in the same quotation currency
    // Difference = NBIM - Custody (in quotation currency)
    const nbimAmount = nbimEvent.total_net_amount;
    const custodyAmount = custodyEvent.total_net_amount;

    const amountDiff = nbimAmount - custodyAmount;
    const amountAbsDiff = Math.abs(amountDiff);

    // Tolerance: 0.01% or 1 unit, whichever is larger
    const tolerance = Math.max(Math.abs(nbimAmount) * 0.0001, 1.0);

    if (amountAbsDiff > tolerance) {
      breaks.push({
        event_key: nbimEvent.event_key,
        instrument: nbimEvent.instrument_name,
        isin: nbimEvent.isin,
        break_type: "AMOUNT",
        nbim_value: nbimAmount,
        custody_value: custodyAmount,
        difference: amountDiff,
        difference_pct: calculatePercentDiff(nbimAmount, custodyAmount),
      });
    }
  }

  return breaks;
}

/**
 * Aggregate NBIM records by Event Key + ISIN
 * Sums nominal basis and net amounts, uses max gross amount
 */
function aggregateByEvent(
  records: NBIMRecord[]
): Record<string, AggregatedEvent> {
  const aggregated: Record<string, AggregatedEvent> = {};

  for (const record of records) {
    const key = `${record.coac_event_key}|${record.isin}`;

    if (!aggregated[key]) {
      aggregated[key] = {
        event_key: record.coac_event_key,
        isin: record.isin,
        instrument_name: record.instrument_name || record.isin,
        ex_date: record.ex_date || "",
        total_nominal_basis: 0,
        max_gross_amount: 0,
        total_net_amount: 0,
        tax_rate: record.wthtax_rate,
        account_count: 0,
      };
    }

    const agg = aggregated[key];
    agg.total_nominal_basis += record.nominal_basis;
    agg.total_net_amount += record.net_amount_quotation || 0;
    agg.max_gross_amount = Math.max(
      agg.max_gross_amount,
      record.gross_amount_quotation || 0
    );
    agg.account_count++;

    // Use tax rate from the largest booking
    if ((record.gross_amount_quotation || 0) > agg.max_gross_amount) {
      agg.tax_rate = record.wthtax_rate;
    }
  }

  return aggregated;
}

/**
 * Aggregate Custody records by Event Key + ISIN
 * Sums nominal basis and net amounts, uses max gross amount
 */
function aggregateCustodyByEvent(
  records: CustodyRecord[]
): Record<string, AggregatedEvent> {
  const aggregated: Record<string, AggregatedEvent> = {};

  for (const record of records) {
    const key = `${record.coac_event_key}|${record.isin}`;

    if (!aggregated[key]) {
      aggregated[key] = {
        event_key: record.coac_event_key,
        isin: record.isin,
        instrument_name: record.instrument_name || record.isin,
        ex_date: record.ex_date || "",
        total_nominal_basis: 0,
        max_gross_amount: 0,
        total_net_amount: 0,
        tax_rate: record.tax_rate,
        account_count: 0,
      };
    }

    const agg = aggregated[key];
    agg.total_nominal_basis += record.nominal_basis;
    agg.total_net_amount += record.net_amount_qc;
    agg.max_gross_amount = Math.max(agg.max_gross_amount, record.gross_amount);
    agg.account_count++;

    // Use tax rate from the largest booking
    if (record.gross_amount > agg.max_gross_amount) {
      agg.tax_rate = record.tax_rate;
    }
  }

  return aggregated;
}

/**
 * Generate summary statistics
 */
export function generateSummary(
  breaks: ReconciliationBreak[],
  nbimRecords: NBIMRecord[]
): ReconciliationSummary {
  // Count unique events (by event key)
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
