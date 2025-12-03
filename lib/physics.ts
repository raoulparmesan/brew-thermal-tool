// /lib/physics.ts
// Module physique professionnel : conduction, convection, bilan énergétique, influence du débit.
// Toutes les fonctions accepts overrides et renvoient valeurs claires.

import { FLUIDS, MATERIALS, DEFAULTS, FluidSpec, MaterialSpec } from "../utils/constants";

export type PowerResult = {
  massKg: number;
  energyJ: number;
  powerW: number;
};

// 1) Masse à partir de litres
export function massFromLiters(liters: number, fluid: FluidSpec = FLUIDS.water): number {
  return (liters / 1000) * fluid.rho;
}

// 2) Énergie & puissance nécessaire pour chauffer un volume d'eau de dT en dt_seconds
export function powerToHeatVolume(
  liters: number,
  deltaT_C: number,
  dt_seconds: number,
  fluid: FluidSpec = FLUIDS.water
): PowerResult {
  const m = massFromLiters(liters, fluid);
  const Q = m * fluid.cp * deltaT_C; // J
  const P = Q / dt_seconds; // W
  return { massKg: m, energyJ: Q, powerW: P };
}

// 3) Résistance de conduction radiale à travers paroi cylindrique
// R_cond = ln(r_o/r_i) / (2π k L)
export function pipeConductionResistance(
  innerRadius: number,
  outerRadius: number,
  length: number,
  material: MaterialSpec = MATERIALS.stainless_steel_304
): number {
  if (outerRadius <= innerRadius) return Infinity;
  const k = material.k;
  return Math.log(outerRadius / innerRadius) / (2 * Math.PI * k * length); // K/W
}

// 4) Nombres adimensionnels : Reynolds, Prandtl
export function reynolds(rho: number, velocity: number, D: number, mu: number): number {
  return (rho * velocity * D) / mu;
}
export function prandtl(cp: number, mu: number, k: number): number {
  return (cp * mu) / k;
}

// 5) Corrélation Dittus-Boelter pour régime turbulent interne (pour fluides newtoniens)
// Nu = 0.023 * Re^0.8 * Pr^0.4 (valide généralement Re > 3000)
export function dittusBoelterNu(Re: number, Pr: number): number {
  if (Re <= 0 || Pr <= 0) return 0;
  return 0.023 * Math.pow(Re, 0.8) * Math.pow(Pr, 0.4);
}

// 6) Coefficient de convection intérieur h (W/m2K)
export function hInside(
  fluid: FluidSpec = FLUIDS.water,
  velocity: number, // m/s
  D: number, // m
  mu: number = fluid.mu || 0.001
): { Re: number; Pr: number; Nu: number; h: number } {
  const Re = reynolds(fluid.rho, velocity, D, mu);
  const Pr = prandtl(fluid.cp, mu, fluid.k || 0.6);
  const Nu = dittusBoelterNu(Re, Pr);
  const h = Nu * (fluid.k || 0.6) / D;
  return { Re, Pr, Nu, h };
}

// 7) Résistance convective (R = 1 / (h*A) ) avec A = 2π r L
export function convectiveResistance(h: number, radius: number, length: number): number {
  const A = 2 * Math.PI * radius * length;
  if (h <= 0 || A <= 0) return Infinity;
  return 1 / (h * A);
}

// 8) Résistance totale & flux thermique d'un segment de tuyau
export function pipeHeatTransfer(
  fluidTempC: number,
  ambientTempC: number,
  innerRadius: number,
  outerRadius: number,
  length: number,
  velocity: number,
  material: MaterialSpec = MATERIALS.stainless_steel_304,
  fluid: FluidSpec = FLUIDS.water,
  mu: number = fluid.mu || 0.001,
  hOutsideEstimate: number | null = null // si null on utilise une valeur par défaut
) {
  const D = innerRadius * 2;
  const inside = hInside(fluid, velocity, D, mu);
  const hIn = inside.h || 0.0001;

  const RconvIn = convectiveResistance(hIn, innerRadius, length);
  const Rcond = pipeConductionResistance(innerRadius, outerRadius, length, material);
  const hOut = hOutsideEstimate !== null ? hOutsideEstimate : 10; // W/m2K par défaut (convection mixte)
  const RconvOut = convectiveResistance(hOut, outerRadius, length);

  const Rtotal = RconvIn + Rcond + RconvOut; // K/W
  // Puissance perdue (W) du fluide (à T_fluid -> amb)
  const QlossW = (fluidTempC - ambientTempC) / Rtotal;

  return {
    insideRe: inside.Re,
    insidePr: inside.Pr,
    insideNu: inside.Nu,
    hInside: hIn,
    hOutside: hOut,
    RconvIn,
    Rcond,
    RconvOut,
    Rtotal,
    QlossW
  };
}

// 9) Modèle lumped (si Bi < 0.1) : constante de temps Tau = R_total * C (C = m*cp)
// Renvoie tau (s) et capacité (J/K)
export function lumpedModelTimeConstant(
  liters: number,
  R_total: number,
  fluid: FluidSpec = FLUIDS.water
): { massKg: number; capacityJperK: number; tauSeconds: number } {
  const m = massFromLiters(liters, fluid);
  const C = m * fluid.cp;
  const tau = R_total * C;
  return { massKg: m, capacityJperK: C, tauSeconds: tau };
}

// 10) ΔT par passage dans un échangeur / chaudière en régime stationnaire
// dT_pass = P / (m_dot * cp)
export function deltaTPerPass(powerW: number, flow_m3s: number, fluid: FluidSpec = FLUIDS.water) {
  const m_dot = flow_m3s * fluid.rho; // kg/s
  if (m_dot <= 0) return { m_dot: 0, deltaT: 0 };
  const dT = powerW / (m_dot * fluid.cp);
  return { m_dot, deltaT };
}

// 11) Approximation du temps pour atteindre une température cible en modélisation lumped
// Integration analytique si puissance nette (P_in - Q_loss(T)) approximée constante -> méthode explicite Euler utilisée côté UI.
// On fournit utilitaires pour simulation numérique côté UI si besoin.

export const helpers = {
  massFromLiters,
  powerToHeatVolume,
  pipeConductionResistance,
  reynolds,
  prandtl,
  dittusBoelterNu,
  hInside,
  convectiveResistance,
  pipeHeatTransfer,
  lumpedModelTimeConstant,
  deltaTPerPass
};
