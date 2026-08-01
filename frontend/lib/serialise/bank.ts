export const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Day = (typeof DAYS)[number];
export type OpeningHours = Partial<Record<Day, [string, string]>>;

// Public shape only - policy_notes is admin-visible only (PRD.md §4.4's
// own inline comment on that column). Do not add it here; a richer
// admin-facing bank type belongs in whichever unit first needs it
// (A4 bank management, Unit 42), not this shared shape.
export type BankCard = {
  id: string;
  name: string;
  address: string;
  phone: string;
  isOpenNow: boolean;
};

type BankRow = {
  id: string;
  name: string;
  address: string;
  phone: string;
  opening_hours: OpeningHours | null;
};

export function isOpenNow(openingHours: OpeningHours | null, now = new Date()): boolean {
  if (!openingHours) return false;
  const day = DAYS[now.getDay()];
  const hours = openingHours[day];
  if (!hours) return false;
  const [open, close] = hours;
  const time = now.toTimeString().slice(0, 5);
  return time >= open && time <= close;
}

export function toBankCard(row: BankRow, now = new Date()): BankCard {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    isOpenNow: isOpenNow(row.opening_hours, now),
  };
}
