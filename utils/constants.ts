// /utils/constants.ts
// Constantes physiques et matériaux par défaut (modifiable)

export type MaterialSpec = {
  name: string;
  k: number; // conductivité thermique W/(m·K)
  rho?: number; // densité matériau (optionnel) kg/m3
};

export type FluidSpec = {
  name: string;
  rho: number; // kg/m3
  cp: number; // J/(kg·K)
  k?: number; // conductivité W/(m·K)
  mu?: number; // dynamic viscosity Pa.s (kg/m.s)
};

export const FLUIDS: Record<string, FluidSpec> = {
  water: {
    name: "Water (typ. 20°C)",
    rho: 998,
    cp: 4186,
    k: 0.6,
    mu: 0.001002 // Pa·s
  }
};

export const MATERIALS: Record<string, MaterialSpec> = {
  stainless_steel_304: { name: "Stainless Steel 304", k: 16 },
  stainless_steel_316: { name: "Stainless Steel 316", k: 16 },
  copper: { name: "Copper", k: 385 },
  carbon_steel: { name: "Carbon steel", k: 60 },
  aluminium: { name: "Aluminium", k: 205 },
  pex: { name: "PEX (polymer)", k: 0.4 }
};

export const DEFAULTS = {
  ambientTempC: 20, // °C
  boilerTempC: 95, // °C
  pipeLengthM: 5, // m
  innerDiameterM: 0.02, // 20 mm
  pipeThicknessM: 0.002, // 2 mm
  flowRateLpm: 20, // L/min
  timeToHeatMin: 30 // minutes
};
