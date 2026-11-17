import { describe, it, expect } from "vitest";
import { calcMinNextBid } from "../auction";

describe("calcMinNextBid", () => {
  it("permite la primera puja igual al precio base", () => {
    expect(calcMinNextBid(1000_00, 0, 1000_00)).toBe(1000_00);
    expect(calcMinNextBid(5000_00, 0, 5000_00)).toBe(5000_00);
  });

  it("aplica al menos 500 pesos de incremento en montos bajos", () => {
    // 5% de $1.000 son $50 (< $500). Aplica +$500 = $1.500
    expect(calcMinNextBid(1000_00, 1, 1000_00)).toBe(1500_00);

    // 5% de $2.000 son $100 (< $500). Aplica +$500 = $2.500
    expect(calcMinNextBid(2000_00, 2, 1000_00)).toBe(2500_00);
  });

  it("aplica el 5% cuando supera los 500 pesos", () => {
    // 5% de $20.000 son $1.000 (> $500). Aplica +$1.000 = $21.000
    expect(calcMinNextBid(20000_00, 1, 1000_00)).toBe(21000_00);

    // 5% de $100.000 son $5.000. Aplica +$5.000 = $105.000
    expect(calcMinNextBid(100000_00, 3, 1000_00)).toBe(105000_00);
  });

  it("redondea los centavos a pesos enteros", () => {
    // 5% de 1234_56 son 61_72 -> redondea a 62_00 (múltiplo de 100)
    // 1234_56 + 500_00 = 1734_56
    const res = calcMinNextBid(12500_00, 1, 1000_00);
    expect(res % 100).toBe(0);
  });
});
