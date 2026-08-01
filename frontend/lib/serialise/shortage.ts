export type Shortage = {
  id: string;
  bloodGroup: string;
  unitsNeeded: number;
  isActive: boolean;
  createdAt: string;
};

type ShortageDbRow = {
  id: string;
  blood_group: string;
  units_needed: number;
  is_active: boolean;
  created_at: string;
};

export function toShortage(row: ShortageDbRow): Shortage {
  return {
    id: row.id,
    bloodGroup: row.blood_group,
    unitsNeeded: row.units_needed,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
