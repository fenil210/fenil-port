export interface TravelFact {
  text: string;
  source: string;
  url: string;
}

export type FactPool = Readonly<Record<string, readonly TravelFact[]>>;
