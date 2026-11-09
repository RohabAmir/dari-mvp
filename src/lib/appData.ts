export interface ApplicationData {
  buyer?: { userId: string; name: string; emiratesId: string };
  contract?: { salePrice: number; contractDate: string; downPaymentPct?: number };
  certType?: string;
  lastComment?: string;
}

export function asDataPublic(value: unknown): ApplicationData {
  return (value && typeof value === "object" ? value : {}) as ApplicationData;
}
