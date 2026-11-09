import { randomInt } from "crypto";

const pad = (n: number, len: number) => n.toString().padStart(len, "0");

function stamp(prefix: string): string {
  const d = new Date();
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth() + 1, 2)}-${pad(randomInt(0, 1_000_000), 6)}`;
}

export const applicationRef = () => stamp("APP");
export const certificateNo = () => stamp("CRT");
export const receiptNo = () => stamp("RCP");
export const escrowAccountNo = () => `AE${pad(randomInt(0, 100), 2)}0330000${pad(randomInt(0, 1_000_000_000), 10)}`;
