export type StockRow = {
  bloodGroup: string;
  component: string;
  units: number;
  updatedAt: string;
  ageHours: number;
  isStale: boolean;
};

type StockDbRow = {
  blood_group: string;
  component: string;
  units: number;
  updated_at: string;
};

// Pure shaping only - freshnessThresholdHours comes from the caller
// (app_settings' bank.stock_freshness_hours, Unit 02), never fetched
// here. lib/serialise/ does not query the database.
export function toStockRow(
  row: StockDbRow,
  freshnessThresholdHours: number,
  now = new Date(),
): StockRow {
  const ageHours = (now.getTime() - new Date(row.updated_at).getTime()) / 3_600_000;
  return {
    bloodGroup: row.blood_group,
    component: row.component,
    units: row.units,
    updatedAt: row.updated_at,
    ageHours,
    isStale: ageHours > freshnessThresholdHours,
  };
}
