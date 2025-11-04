import type { ReconciliationBreak, ReconciliationSummary } from './types';

// Mock reconciliation breaks based on PRD test scenarios
export const mockBreaks: ReconciliationBreak[] = [
  // Event 960789012 (Samsung) - Securities lending issue
  {
    event_key: '960789012',
    instrument: 'Samsung Electronics Co Ltd',
    isin: 'KR7005930003',
    break_type: 'QUANTITY',
    nbim_value: 100_000,
    custody_value: 92_000,
    difference: -8_000,
    difference_pct: -8.0,
    severity: 'HIGH',
    root_cause: 'Securities Lending',
    explanation:
      'The 8% difference in nominal basis is due to securities on loan. The custodian reports 92K shares held while NBIM books show 100K shares owned. This is a typical securities lending scenario where loaned shares are not included in custodian holdings but remain on NBIM books.',
    recommendation:
      'Verify securities lending records. Confirm 8,000 shares are currently on loan. Ensure loan recall procedures are in place if needed for corporate actions.',
    confidence: 0.95,
  },
  {
    event_key: '960789012',
    instrument: 'Samsung Electronics Co Ltd',
    isin: 'KR7005930003',
    break_type: 'TAX_RATE',
    nbim_value: 22.0,
    custody_value: 20.0,
    difference: 2.0,
    difference_pct: 10.0,
    severity: 'MEDIUM',
    root_cause: 'Tax Withholding Discrepancy',
    explanation:
      'NBIM booking shows 22% withholding tax rate while custodian reports 20%. This could indicate a difference in tax treaty application, restitution expectations, or a data entry error. The 2% difference on a large holding represents material variance.',
    recommendation:
      'Review tax treaty application for Korean dividends. Verify if the additional 2% is expected to be reclaimed through tax restitution. Contact custodian to confirm their tax rate calculation basis.',
    confidence: 0.88,
  },
  {
    event_key: '960789012',
    instrument: 'Samsung Electronics Co Ltd',
    isin: 'KR7005930003',
    break_type: 'AMOUNT',
    nbim_value: 234_560.0,
    custody_value: 228_450.0,
    difference: -6_110.0,
    difference_pct: -2.6,
    severity: 'MEDIUM',
    root_cause: 'Combined Impact of Quantity and Tax Rate Differences',
    explanation:
      'Net amount variance of $6,110 stems from the combination of securities lending (8% fewer shares at custodian) and tax rate discrepancy (22% vs 20%). The lower share count and different withholding rate compound to create this net payment difference.',
    recommendation:
      'Address the underlying quantity and tax rate breaks first. Once securities lending is confirmed and tax rates are reconciled, this amount difference should resolve automatically. No independent action required.',
    confidence: 0.92,
  },

  // Event 970456789 (Nestlé) - Split bookings with position mismatches
  {
    event_key: '970456789',
    instrument: 'Nestlé SA',
    isin: 'CH0038863350',
    break_type: 'QUANTITY',
    nbim_value: 15_000,
    custody_value: 30_000,
    difference: 15_000,
    difference_pct: 100.0,
    severity: 'CRITICAL',
    root_cause: 'Account Position Mismatch',
    explanation:
      'Account 823456790 shows NBIM booked 15K shares but custodian reports 30K shares held. This is a significant discrepancy - double the expected quantity. Likely causes include duplicate booking, incorrect split allocation, or settlement timing issues where additional shares were received but not yet booked.',
    recommendation:
      'URGENT: Investigate settlement records for account 823456790. Check for duplicate dividend entitlements or unsettled purchases. Review recent corporate actions that may have affected share count. Escalate to operations manager for immediate review.',
    confidence: 0.87,
  },
  {
    event_key: '970456789',
    instrument: 'Nestlé SA',
    isin: 'CH0038863350',
    break_type: 'QUANTITY',
    nbim_value: 10_000,
    custody_value: 12_000,
    difference: 2_000,
    difference_pct: 20.0,
    severity: 'HIGH',
    root_cause: 'Split Booking Allocation Error',
    explanation:
      'Account 823456791 has a 20% variance - NBIM books show 10K shares while custodian reports 12K. This appears to be a split booking allocation issue where dividend rights may have been calculated on different share counts, possibly due to intra-day transfers or settlement timing.',
    recommendation:
      'Review split booking logic for this event. Verify share balances at ex-date for account 823456791. Check if the 2,000 share difference relates to the 15,000 discrepancy in account 823456790. May require booking adjustment.',
    confidence: 0.84,
  },
  {
    event_key: '970456789',
    instrument: 'Nestlé SA',
    isin: 'CH0038863350',
    break_type: 'AMOUNT',
    nbim_value: 125_000.0,
    custody_value: 145_600.0,
    difference: 20_600.0,
    difference_pct: 16.48,
    severity: 'CRITICAL',
    root_cause: 'Quantity Discrepancy Flow-Through',
    explanation:
      'Net amount variance of $20,600 (16.48%) is the direct result of the quantity mismatches across accounts. The custodian paid out on 42K total shares while NBIM only booked 25K shares, creating this significant payment gap.',
    recommendation:
      'Priority action required. Once quantity breaks in accounts 823456790 and 823456791 are resolved, this amount should reconcile. Do not attempt to adjust amounts independently - fix the underlying position breaks first. Monitor for any duplicate payments.',
    confidence: 0.91,
  },
];

export const mockSummary: ReconciliationSummary = {
  total_events: 3,
  total_breaks: 6,
  breaks_by_severity: {
    CRITICAL: 2,
    HIGH: 2,
    MEDIUM: 2,
    LOW: 0,
  },
  breaks_by_type: {
    QUANTITY: 3,
    AMOUNT: 2,
    TAX_RATE: 1,
    MISSING_RECORD: 0,
  },
  total_cost: 0.12, // Estimated LLM cost
  total_tokens: 8_450,
};
