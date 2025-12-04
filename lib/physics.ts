// /lib/physics.ts
// Module physique professionnel : conduction, convection, bilan énergétique, influence du débit.

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

// 4) Nombres adimensionnels
export function reynolds(rho: number, velocity: number, D: number, mu: number): number {
  return (rho * velocity * D) / mu;
}
export function prandtl(cp: number, mu: number, k: number): number {
  return (cp * mu) / k;
}

// 5) Corrélation Dittus-Boelter (turbulent interne)
export function dittusBoelterNu(Re: number, Pr: number): number {
  if (Re <= 0 || Pr <= 0) return 0;
  return 0.023 * Math.pow(Re, 0.8) * Math.pow(Pr, 0.4);
}

// 6) Coefficient de convection intérieur h
export function hInside(
  fluid: FluidSpec = FLUIDS.water,
  velocity: number,
  D: number,
  mu: number = fluid.mu || 0.001
): { Re: number; Pr: number; Nu: number; h: number } {
  const Re = reynolds(fluid.rho, velocity, D, mu);
  const Pr = prandtl(fluid.cp, mu, fluid.k || 0.6);
  const Nu = dittusBoelterNu(Re, Pr);
  const h = Nu * (fluid.k || 0.6) / D;
  return { Re, Pr, Nu, h };
}

// 7) Résistance convective
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
  hOutsideEstimate: number | null = null
) {
  const D = innerRadius * 2;
  const inside = hInside(fluid, velocity, D, mu);
  const hIn = inside.h || 0.0001;

  const RconvIn = convectiveResistance(hIn, innerRadius, length);
  const Rcond = pipeConductionResistance(innerRadius, outerRadius, length, material);
  const hOut = hOutsideEstimate !== null ? hOutsideEstimate : 10;
  const RconvOut = convectiveResistance(hOut, outerRadius, length);

  const Rtotal = RconvIn + Rcond + RconvOut;
  const QlossW = (fluidTempC - ambientTempC) / Rtotal;

  return {
    insideRe: inside.Re || 0,
    insidePr: inside.Pr || 0,
    insideNu: inside.Nu || 0,
    hInside: hIn,
    hOutside: hOut,
    RconvIn,
    Rcond,
    RconvOut,
    Rtotal,
    QlossW,
  };
}

// 9) Modèle lumped – constante de temps
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

// 10) ΔT par passage dans un échangeur / chaudière (corrigé !)
export function deltaTPerPass(
  powerW: number,
  flow_m3s: number,
  fluid: FluidSpec = FLUIDS.water
): { m_dot: number; deltaT: number } {
  const m_dot = flow_m3s * fluid.rho; // kg/s
  if (m_dot <= 0) return { m_dot: 0, deltaT: 0 };
  const deltaT = powerW / (m_dot * fluid.cp);
  return { m_dot, deltaT };
}

// Export unique pour l'import côté UI
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
  deltaTPerPass,
};
