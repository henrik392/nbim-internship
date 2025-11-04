/**
 * Production-Quality Reconciliation Engine
 * - Recomputes all amounts from base fields
 * - Validates field consistency
 * - Detects comprehensive break types
 * - Account-level and event-level analysis
 */

import type {
  CustodyRecord,
  NBIMRecord,
  ReconciliationBreak,
  ReconciliationSummary,
} from "./types";

// Tolerance constants
const TOLERANCE = {
  QUANTITY: 1, // 1 share
  AMOUNT_2DP: 0.01, // For USD, CHF, EUR
  AMOUNT_0DP: 1, // For KRW, JPY
  TAX_RATE: 0.1, // 0.1 percentage point
  FX_RATE: 0.0005, // 5 basis points
  DIVIDEND_RATE: 0.001, // 0.1 cent per share
};

/**
 * Recomputed values for comparison
 */
type RecomputedValues = {
  gross: number;
  tax: number;
  net: number;
};

/**
 * Main reconciliation function
 * Returns account-level breaks (most granular)
 */
export function reconcile(
  nbimRecords: NBIMRecord[],
  custodyRecords: CustodyRecord[]
): ReconciliationBreak[] {
  const breaks: ReconciliationBreak[] = [];

  // Build lookup maps
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

  // Process each NBIM record at account level
  for (const nbimRec of nbimRecords) {
    const matchKey = makeMatchKey(
      nbimRec.coac_event_key,
      nbimRec.isin,
      nbimRec.account_number || ""
    );

    const custodyRec = custodyMap.get(matchKey);

    if (!custodyRec) {
      // Missing in custody
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

    custodyUsed.add(matchKey);

    // STEP 1: Field Validation (Data Quality Checks)
    const fieldBreaks = validateFields(nbimRec, custodyRec);
    breaks.push(...fieldBreaks);

    // STEP 2: Recompute amounts from base fields
    const nbimComputed = recomputeNBIM(nbimRec);
    const custodyComputed = recomputeCustody(custodyRec);

    // STEP 3: Validate recomputed vs provided amounts
    const calcBreaks = validateCalculations(
      nbimRec,
      custodyRec,
      nbimComputed,
      custodyComputed
    );
    breaks.push(...calcBreaks);

    // STEP 4: Compare recomputed values (the source of truth)
    // Only report PRIMARY breaks to avoid cascading duplicates
    const compBreaks = compareValues(
      nbimRec,
      custodyRec,
      nbimComputed,
      custodyComputed
    );
    breaks.push(...compBreaks);

    // STEP 5: Check dates
    const dateBreaks = compareDates(nbimRec, custodyRec);
    breaks.push(...dateBreaks);

    // STEP 6: Check FX (for cross-currency)
    if (custodyRec.fx_rate) {
      const fxBreaks = compareFX(nbimRec, custodyRec);
      breaks.push(...fxBreaks);
    }

    // STEP 7: Check restitution
    if (nbimRec.restitution_rate && custodyRec.restitution_amount) {
      const restBreaks = compareRestitution(nbimRec, custodyRec);
      breaks.push(...restBreaks);
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
 * Validate field consistency (data quality checks)
 * E.g., Nestle account 823456790: nominal_basis=30K but holding=15K
 */
function validateFields(
  nbimRec: NBIMRecord,
  custodyRec: CustodyRecord
): ReconciliationBreak[] {
  const breaks: ReconciliationBreak[] = [];

  // Check if custody nominal_basis matches the quantity used for calculations
  // In custody data, amounts should be based on nominal_basis, not holding_quantity
  if (custodyRec.nominal_basis !== custodyRec.holding_quantity) {
    // This is a data quality issue in the custody file
    const expectedGross = custodyRec.nominal_basis * custodyRec.dividend_rate;
    if (
      Math.abs(custodyRec.gross_amount - expectedGross) > TOLERANCE.AMOUNT_2DP
    ) {
      breaks.push({
        event_key: custodyRec.coac_event_key,
        instrument: nbimRec.instrument_name || nbimRec.isin,
        isin: nbimRec.isin,
        break_type: "FIELD_INCONSISTENCY",
        nbim_value: custodyRec.nominal_basis,
        custody_value: custodyRec.holding_quantity,
        difference: custodyRec.nominal_basis - custodyRec.holding_quantity,
        difference_pct: calculatePercentDiff(
          custodyRec.holding_quantity,
          custodyRec.nominal_basis
        ),
      });
    }
  }

  return breaks;
}

/**
 * Recompute NBIM amounts from base fields
 */
function recomputeNBIM(rec: NBIMRecord): RecomputedValues {
  const gross = rec.nominal_basis * rec.dividend_per_share;
  const tax = rec.wthtax_amount + (rec.localtax_amount || 0);
  const net = gross - tax;
  return { gross, tax, net };
}

/**
 * Recompute Custody amounts from base fields
 */
function recomputeCustody(rec: CustodyRecord): RecomputedValues {
  // Use holding_quantity if amounts are based on it, otherwise nominal_basis
  const effectiveQuantity = rec.holding_quantity || rec.nominal_basis;
  const gross = effectiveQuantity * rec.dividend_rate;
  const tax = rec.tax_amount;
  const net = gross - tax;
  return { gross, tax, net };
}

/**
 * Validate that provided amounts match recomputed amounts
 */
function validateCalculations(
  nbimRec: NBIMRecord,
  custodyRec: CustodyRecord,
  nbimComp: RecomputedValues,
  custComp: RecomputedValues
): ReconciliationBreak[] {
  const breaks: ReconciliationBreak[] = [];
  const tolerance = getTolerance(nbimRec.quotation_currency);

  // Check NBIM calculations
  if (Math.abs(nbimRec.gross_amount_quotation - nbimComp.gross) > tolerance) {
    breaks.push({
      event_key: nbimRec.coac_event_key,
      instrument: nbimRec.instrument_name || nbimRec.isin,
      isin: nbimRec.isin,
      break_type: "CALCULATION_ERROR",
      nbim_value: nbimRec.gross_amount_quotation,
      custody_value: nbimComp.gross,
      difference: nbimRec.gross_amount_quotation - nbimComp.gross,
      difference_pct: 0,
    });
  }

  // Check Custody calculations
  if (Math.abs(custodyRec.gross_amount - custComp.gross) > tolerance) {
    breaks.push({
      event_key: custodyRec.coac_event_key,
      instrument: nbimRec.instrument_name || nbimRec.isin,
      isin: nbimRec.isin,
      break_type: "CALCULATION_ERROR",
      nbim_value: custComp.gross,
      custody_value: custodyRec.gross_amount,
      difference: custComp.gross - custodyRec.gross_amount,
      difference_pct: 0,
    });
  }

  return breaks;
}

/**
 * Compare recomputed values between NBIM and Custody
 * Only reports PRIMARY breaks to avoid cascading duplicates
 */
function compareValues(
  nbimRec: NBIMRecord,
  custodyRec: CustodyRecord,
  nbimComp: RecomputedValues,
  custComp: RecomputedValues
): ReconciliationBreak[] {
  const breaks: ReconciliationBreak[] = [];
  const tolerance = getTolerance(nbimRec.quotation_currency);

  // Track which root causes we've found
  let hasQuantityBreak = false;
  let hasDividendRateBreak = false;
  let hasTaxRateBreak = false;

  // 1. Quantity (PRIMARY break)
  const quantityDiff = nbimRec.nominal_basis - custodyRec.holding_quantity;
  if (Math.abs(quantityDiff) > TOLERANCE.QUANTITY) {
    hasQuantityBreak = true;
    breaks.push({
      event_key: nbimRec.coac_event_key,
      instrument: nbimRec.instrument_name || nbimRec.isin,
      isin: nbimRec.isin,
      break_type: "QUANTITY",
      nbim_value: nbimRec.nominal_basis,
      custody_value: custodyRec.holding_quantity,
      difference: quantityDiff,
      difference_pct: calculatePercentDiff(
        nbimRec.nominal_basis,
        custodyRec.holding_quantity
      ),
    });
  }

  // 2. Dividend Rate (PRIMARY break)
  const divRateDiff = nbimRec.dividend_per_share - custodyRec.dividend_rate;
  if (Math.abs(divRateDiff) > TOLERANCE.DIVIDEND_RATE) {
    hasDividendRateBreak = true;
    breaks.push({
      event_key: nbimRec.coac_event_key,
      instrument: nbimRec.instrument_name || nbimRec.isin,
      isin: nbimRec.isin,
      break_type: "DIVIDEND_RATE",
      nbim_value: nbimRec.dividend_per_share,
      custody_value: custodyRec.dividend_rate,
      difference: divRateDiff,
      difference_pct: calculatePercentDiff(
        nbimRec.dividend_per_share,
        custodyRec.dividend_rate
      ),
    });
  }

  // 3. Tax Rate (PRIMARY break)
  const taxRateDiff = nbimRec.total_tax_rate - custodyRec.tax_rate;
  if (Math.abs(taxRateDiff) > TOLERANCE.TAX_RATE) {
    hasTaxRateBreak = true;
    breaks.push({
      event_key: nbimRec.coac_event_key,
      instrument: nbimRec.instrument_name || nbimRec.isin,
      isin: nbimRec.isin,
      break_type: "TAX_RATE",
      nbim_value: nbimRec.total_tax_rate,
      custody_value: custodyRec.tax_rate,
      difference: taxRateDiff,
      difference_pct: calculatePercentDiff(
        nbimRec.total_tax_rate,
        custodyRec.tax_rate
      ),
    });
  }

  // 4. Gross Amount (only report if NOT caused by quantity or dividend rate)
  const grossDiff = nbimComp.gross - custComp.gross;
  if (
    Math.abs(grossDiff) > tolerance &&
    !hasQuantityBreak &&
    !hasDividendRateBreak
  ) {
    breaks.push({
      event_key: nbimRec.coac_event_key,
      instrument: nbimRec.instrument_name || nbimRec.isin,
      isin: nbimRec.isin,
      break_type: "GROSS_AMOUNT",
      nbim_value: nbimComp.gross,
      custody_value: custComp.gross,
      difference: grossDiff,
      difference_pct: calculatePercentDiff(nbimComp.gross, custComp.gross),
    });
  }

  // 5. Tax Amount (only report if NOT caused by quantity or tax rate)
  const taxAmtDiff = nbimComp.tax - custComp.tax;
  if (
    Math.abs(taxAmtDiff) > tolerance &&
    !hasQuantityBreak &&
    !hasTaxRateBreak
  ) {
    breaks.push({
      event_key: nbimRec.coac_event_key,
      instrument: nbimRec.instrument_name || nbimRec.isin,
      isin: nbimRec.isin,
      break_type: "TAX_AMOUNT",
      nbim_value: nbimComp.tax,
      custody_value: custComp.tax,
      difference: taxAmtDiff,
      difference_pct: calculatePercentDiff(nbimComp.tax, custComp.tax),
    });
  }

  // 6. Net Amount (only report if NOT caused by any other root cause)
  const netDiff = nbimComp.net - custComp.net;
  if (
    Math.abs(netDiff) > tolerance &&
    !hasQuantityBreak &&
    !hasDividendRateBreak &&
    !hasTaxRateBreak
  ) {
    breaks.push({
      event_key: nbimRec.coac_event_key,
      instrument: nbimRec.instrument_name || nbimRec.isin,
      isin: nbimRec.isin,
      break_type: "AMOUNT",
      nbim_value: nbimComp.net,
      custody_value: custComp.net,
      difference: netDiff,
      difference_pct: calculatePercentDiff(nbimComp.net, custComp.net),
    });
  }

  return breaks;
}

/**
 * Compare dates
 * Only reports if dates actually differ (not just missing)
 */
function compareDates(
  nbimRec: NBIMRecord,
  custodyRec: CustodyRecord
): ReconciliationBreak[] {
  const breaks: ReconciliationBreak[] = [];

  // Payment date mismatch - only report if BOTH exist and DIFFER
  if (
    nbimRec.payment_date &&
    custodyRec.payment_date &&
    nbimRec.payment_date.trim() !== "" &&
    custodyRec.payment_date.trim() !== "" &&
    nbimRec.payment_date !== custodyRec.payment_date
  ) {
    breaks.push({
      event_key: nbimRec.coac_event_key,
      instrument: nbimRec.instrument_name || nbimRec.isin,
      isin: nbimRec.isin,
      break_type: "DATE_MISMATCH",
      nbim_value: nbimRec.payment_date as any, // Store actual date as string
      custody_value: custodyRec.payment_date as any,
      difference: null as any, // Not numeric
      difference_pct: null as any,
    });
  }

  return breaks;
}

/**
 * Compare FX rates
 */
function compareFX(
  nbimRec: NBIMRecord,
  custodyRec: CustodyRecord
): ReconciliationBreak[] {
  const breaks: ReconciliationBreak[] = [];

  if (custodyRec.fx_rate && nbimRec.fx_rate) {
    const fxDiff = Math.abs(nbimRec.fx_rate - custodyRec.fx_rate);
    if (fxDiff > TOLERANCE.FX_RATE) {
      breaks.push({
        event_key: nbimRec.coac_event_key,
        instrument: nbimRec.instrument_name || nbimRec.isin,
        isin: nbimRec.isin,
        break_type: "FX_DIFFERENCE",
        nbim_value: nbimRec.fx_rate,
        custody_value: custodyRec.fx_rate,
        difference: nbimRec.fx_rate - custodyRec.fx_rate,
        difference_pct: calculatePercentDiff(
          nbimRec.fx_rate,
          custodyRec.fx_rate
        ),
      });
    }
  }

  return breaks;
}

/**
 * Compare restitution expectations
 */
function compareRestitution(
  nbimRec: NBIMRecord,
  custodyRec: CustodyRecord
): ReconciliationBreak[] {
  const breaks: ReconciliationBreak[] = [];

  // NBIM expects restitution but custody has different amount
  if (
    nbimRec.restitution_rate &&
    nbimRec.restitution_rate > 0 &&
    custodyRec.restitution_amount
  ) {
    // Compare expectation
    const nbimExpected = nbimRec.restitution_rate;
    const custodyAmount = custodyRec.restitution_amount;

    if (custodyAmount > 0 && nbimExpected === 0) {
      breaks.push({
        event_key: nbimRec.coac_event_key,
        instrument: nbimRec.instrument_name || nbimRec.isin,
        isin: nbimRec.isin,
        break_type: "RESTITUTION_MISMATCH",
        nbim_value: nbimExpected,
        custody_value: custodyAmount,
        difference: nbimExpected - custodyAmount,
        difference_pct: 0,
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

  const breaksByType: Record<string, number> = {
    QUANTITY: 0,
    AMOUNT: 0,
    TAX_RATE: 0,
    TAX_AMOUNT: 0,
    GROSS_AMOUNT: 0,
    DIVIDEND_RATE: 0,
    FIELD_INCONSISTENCY: 0,
    CALCULATION_ERROR: 0,
    FX_DIFFERENCE: 0,
    DATE_MISMATCH: 0,
    RESTITUTION_MISMATCH: 0,
    MISSING_RECORD: 0,
  };

  const breaksBySeverity = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const breakItem of breaks) {
    breaksByType[breakItem.break_type] =
      (breaksByType[breakItem.break_type] || 0) + 1;

    if (breakItem.severity) {
      breaksBySeverity[breakItem.severity]++;
    }
  }

  return {
    total_events: uniqueEvents.size,
    events_with_breaks: eventsWithBreaks.size,
    total_breaks: breaks.length,
    breaks_by_severity: breaksBySeverity,
    breaks_by_type: breaksByType as any,
    total_cost: 0,
    total_tokens: 0,
  };
}

// Helper functions

function makeMatchKey(eventKey: string, isin: string, account: string): string {
  return `${eventKey}|${isin}|${account}`;
}

function getTolerance(currency: string): number {
  const zeroDpCurrencies = ["KRW", "JPY"];
  return zeroDpCurrencies.includes(currency)
    ? TOLERANCE.AMOUNT_0DP
    : TOLERANCE.AMOUNT_2DP;
}

function calculatePercentDiff(value1: number, value2: number): number {
  if (value1 === 0 && value2 === 0) {
    return 0;
  }
  if (value1 === 0) {
    return 100;
  }
  return ((value2 - value1) / Math.abs(value1)) * 100;
}
