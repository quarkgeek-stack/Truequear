import { describe, expect, it } from "vitest";
import { calculateCommissionCents, canCreateConversation } from "../commission";

describe("calculateCommissionCents", () => {
  it("devuelve 0 cuando la operación es TRUEQUE", () => {
    expect(
      calculateCommissionCents({
        kind: "TRUEQUE",
        agreedPriceCents: 150000_00,
        commissionBps: 400,
      })
    ).toBe(0);
  });

  it("devuelve 0 en los bordes cuando el precio o bps es 0 o nulo", () => {
    expect(
      calculateCommissionCents({
        kind: "VENTA",
        agreedPriceCents: 0,
        commissionBps: 400,
      })
    ).toBe(0);

    expect(
      calculateCommissionCents({
        kind: "VENTA",
        agreedPriceCents: null,
        commissionBps: 400,
      })
    ).toBe(0);

    expect(
      calculateCommissionCents({
        kind: "VENTA",
        agreedPriceCents: 100000_00,
        commissionBps: 0,
      })
    ).toBe(0);
  });

  it("calcula el 4% (400 bps) y redondea correctamente al centavo más cercano", () => {
    // $160.000 -> 4% = $6.400 (640.000 centavos)
    expect(
      calculateCommissionCents({
        kind: "VENTA",
        agreedPriceCents: 160000_00,
        commissionBps: 400,
      })
    ).toBe(6400_00);

    // Prueba de redondeo: 123 centavos * 350 bps / 10000 = 4.305 -> 4
    expect(
      calculateCommissionCents({
        kind: "VENTA",
        agreedPriceCents: 123,
        commissionBps: 350,
      })
    ).toBe(4);

    // 125 centavos * 350 bps / 10000 = 4.375 -> 4; con 360 bps = 4.5 -> 5
    expect(
      calculateCommissionCents({
        kind: "VENTA",
        agreedPriceCents: 125,
        commissionBps: 360,
      })
    ).toBe(5);
  });

  it("respeta los topes mínimo y máximo de comisión", () => {
    // Tope mínimo
    expect(
      calculateCommissionCents({
        kind: "VENTA",
        agreedPriceCents: 1000_00, // 4% sería 40_00
        commissionBps: 400,
        minCommissionCents: 500_00,
      })
    ).toBe(500_00);

    // Tope máximo
    expect(
      calculateCommissionCents({
        kind: "VENTA",
        agreedPriceCents: 5000000_00, // 4% sería 200000_00
        commissionBps: 400,
        minCommissionCents: 500_00,
        maxCommissionCents: 50000_00,
      })
    ).toBe(50000_00);
  });
});

describe("canCreateConversation", () => {
  it("impide crear conversación si buyerId es igual a ownerId", () => {
    expect(canCreateConversation("user-123", "user-123")).toBe(false);
  });

  it("impide crear conversación si falta alguno de los IDs", () => {
    expect(canCreateConversation("", "user-123")).toBe(false);
    expect(canCreateConversation("user-123", "")).toBe(false);
  });

  it("permite crear conversación cuando buyerId y ownerId son distintos", () => {
    expect(canCreateConversation("buyer-1", "seller-2")).toBe(true);
  });
});
