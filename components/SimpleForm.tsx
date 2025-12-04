"use client";

import React, { useMemo, useState } from "react";
import { FLUIDS, MATERIALS, DEFAULTS } from "../utils/constants";
import { helpers } from "../lib/physics";

// ========== DEBUG BUILD TAG ==========
console.log(
  "[SimpleForm] Mounted — build tag:",
  process.env.NEXT_PUBLIC_BUILD_TAG || "no-build-tag"
);
// ======================================

export default function SimpleForm() {
  // Inputs
  const [liters, setLiters] = useState<number>(200);
  const [initialTemp, setInitialTemp] = useState<number>(20);
  const [targetTemp, setTargetTemp] = useState<number>(75);
  const [timeMin, setTimeMin] = useState<number>(30);
  const [flowLpm, setFlowLpm] = useState<number>(20);
  const [innerDiameter, setInnerDiameter] = useState<number>(DEFAULTS.innerDiameterM);
  const [thickness, setThickness] = useState<number>(DEFAULTS.pipeThicknessM);
  const [pipeLength, setPipeLength] = useState<number>(DEFAULTS.pipeLengthM);
  const [materialKey, setMaterialKey] = useState<string>("stainless_steel_304");
  const [ambientTemp, setAmbientTemp] = useState<number>(DEFAULTS.ambientTempC);
  const [boilerTemp, setBoilerTemp] = useState<number>(DEFAULTS.boilerTempC);

  // Derived
  const dtSeconds = timeMin * 60;
  const deltaT = targetTemp - initialTemp;
  const flow_m3s = (flowLpm / 60) / 1000; // m3/s
  const innerRadius = innerDiameter / 2;
  const outerRadius = innerRadius + thickness;

  const velocity = useMemo(() => {
    const area = Math.PI * innerRadius * innerRadius;
    if (area <= 0) return 0;
    return flow_m3s / area;
  }, [flow_m3s, innerRadius]);

  // Required heating power ignoring losses
  const powerIdeal = useMemo(() => {
    return helpers.powerToHeatVolume(liters, deltaT, dtSeconds, FLUIDS.water);
  }, [liters, deltaT, dtSeconds]);

  // Pipe heat transfer at target temp
  const pipeTransfer = useMemo(() => {
    const mat = MATERIALS[materialKey] || MATERIALS.stainless_steel_304;
    return helpers.pipeHeatTransfer(
      targetTemp,
      ambientTemp,
      innerRadius,
      outerRadius,
      pipeLength,
      velocity,
      mat,
      FLUIDS.water
    );
  }, [targetTemp, ambientTemp, innerRadius, outerRadius, pipeLength, velocity, materialKey]);

  // Net required power
  const requiredPowerW = useMemo(() => {
    let extraLoss = Math.max(0, pipeTransfer.QlossW || 0);
    return powerIdeal.powerW + extraLoss;
  }, [powerIdeal, pipeTransfer]);

  // Theoretical ΔT per pass
  const perPass = useMemo(() => {
    return helpers.deltaTPerPass(requiredPowerW, flow_m3s, FLUIDS.water);
  }, [requiredPowerW, flow_m3s]);

  // Lumped time constant
  const lumped = useMemo(() => {
    const Rtot = pipeTransfer.Rtotal || 1e6;
    return helpers.lumpedModelTimeConstant(liters, Rtot, FLUIDS.water);
  }, [liters, pipeTransfer]);

  // Euler simulation
  const [simulateSeconds, setSimulateSeconds] = useState<number>(Math.max(60, dtSeconds));
  const [simData, setSimData] = useState<Array<{ t: number; T: number }>>([]);

  function runSimulation(dtStep = 1, total = simulateSeconds) {
    const m = helpers.massFromLiters(liters, FLUIDS.water);
    const C = m * FLUIDS.water.cp;
    let T = initialTemp;
    const out: Array<{ t: number; T: number }> = [];
    const mat = MATERIALS[materialKey] || MATERIALS.stainless_steel_304;

    for (let t = 0; t <= total; t += dtStep) {
      const local = helpers.pipeHeatTransfer(
        T,
        ambientTemp,
        innerRadius,
        outerRadius,
        pipeLength,
        velocity,
        mat,
        FLUIDS.water
      );
      const Qloss = local.QlossW;
      const Pin = requiredPowerW;
      const dTdt = (Pin - Qloss) / C;

      T += dTdt * dtStep;
      out.push({ t, T });
      if (T >= targetTemp) break;
    }

    setSimData(out);
    return out;
  }

  function resetSim() {
    setSimData([]);
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      
      {/* ====== BUILD TAG VISIBLE ====== */}
      <div className="text-xs text-gray-500 mb-2">
        Build: {process.env.NEXT_PUBLIC_BUILD_TAG || "unknown"}
      </div>
      {/* ================================= */}

      <h2 className="text-xl font-semibold mb-3">Simulateur thermique — version professionnelle</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          Volume (L)
          <input className="w-full border p-2 rounded" type="number" value={liters}
            onChange={e => setLiters(Number(e.target.value))} />
        </label>

        <label className="block">
          Débit pompe (L/min)
          <input className="w-full border p-2 rounded" type="number" value={flowLpm}
            onChange={e => setFlowLpm(Number(e.target.value))} />
        </label>

        <label className="block">
          Temp initiale (°C)
          <input className="w-full border p-2 rounded" type="number" value={initialTemp}
            onChange={e => setInitialTemp(Number(e.target.value))} />
        </label>

        <label className="block">
          Temp cible (°C)
          <input className="w-full border p-2 rounded" type="number" value={targetTemp}
            onChange={e => setTargetTemp(Number(e.target.value))} />
        </label>

        <label className="block">
          Temps cible (min)
          <input className="w-full border p-2 rounded" type="number" value={timeMin}
            onChange={e => setTimeMin(Number(e.target.value))} />
        </label>

        <label className="block">
          Temp ambiante (°C)
          <input className="w-full border p-2 rounded" type="number" value={ambientTemp}
            onChange={e => setAmbientTemp(Number(e.target.value))} />
        </label>

        <label className="block">
          Diamètre intérieur (m)
          <input className="w-full border p-2 rounded" type="number" step="0.001" value={innerDiameter}
            onChange={e => setInnerDiameter(Number(e.target.value))} />
        </label>

        <label className="block">
          Épaisseur (m)
          <input className="w-full border p-2 rounded" type="number" step="0.001" value={thickness}
            onChange={e => setThickness(Number(e.target.value))} />
        </label>

        <label className="block">
          Longueur tuyau (m)
          <input className="w-full border p-2 rounded" type="number" step="0.1" value={pipeLength}
            onChange={e => setPipeLength(Number(e.target.value))} />
        </label>

        <label className="block">
          Matériau
          <select className="w-full border p-2 rounded" value={materialKey}
            onChange={e => setMaterialKey(e.target.value)}>
            {Object.keys(MATERIALS).map(k => (
              <option key={k} value={k}>{(MATERIALS as any)[k].name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 p-3 border rounded space-y-2">
        <div>Puissance idéale : <b>{Math.round(powerIdeal.powerW)} W</b></div>
        <div>Énergie nécessaire : <b>{Math.round(powerIdeal.energyJ / 1000)} kJ</b></div>
        <div>Perte tuyau : <b>{Math.round(pipeTransfer.QlossW)} W</b></div>
        <div>Puissance recommandée : <b>{Math.round(requiredPowerW)} W</b></div>
        <div>ΔT par passe : <b>{perPass.deltaT?.toFixed(2) || "0.00"} °C</b></div>
        <div>Vitesse fluide : <b>{velocity.toFixed(3)} m/s</b></div>
        <div>Reynolds intérieur : <b>{Math.round(pipeTransfer.insideRe)}</b></div>
        <div>Constante τ : <b>{Math.round(lumped.tauSeconds)}</b> s</div>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="px-3 py-2 rounded bg-blue-600 text-white"
          onClick={() => { runSimulation(1, Math.max(60, timeMin * 60)); }}>
          Lancer simulation
