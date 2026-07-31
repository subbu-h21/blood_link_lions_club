import type { BankCard } from "./bank";
import type { StockRow } from "./stock";

export type BankWithStock = BankCard & { stock: StockRow[] };

export type SearchResult = {
  region: { id: string; name: string };
  banks: BankWithStock[];
  adjacentRegions: { id: string; name: string }[];
};
