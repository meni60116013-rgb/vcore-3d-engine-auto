export class TubularProfileEngine {
  constructor(outerDiameter, thickness, length, materialDensity = 7.85) {
    this.dOut = Number(outerDiameter);
    this.thickness = Number(thickness);
    this.dIn = this.dOut - 2 * this.thickness;
    this.length = Number(length);
    this.density = Number(materialDensity);
  }

  isValidGeometry() {
    return this.dOut > 0 && this.thickness > 0 && this.dIn > 0 && this.length > 0;
  }

  get crossSectionArea() {
    if (!this.isValidGeometry()) return 0;
    return (Math.PI / 4) * (Math.pow(this.dOut, 2) - Math.pow(this.dIn, 2));
  }

  get volume() {
    return (this.crossSectionArea * this.length) / 1000;
  }

  get mass() {
    return (this.volume * this.density) / 1000;
  }

  get polarMomentOfInertia() {
    if (!this.isValidGeometry()) return 0;
    return (Math.PI / 32) * (Math.pow(this.dOut, 4) - Math.pow(this.dIn, 4));
  }

  get torsionalSectionModulus() {
    if (!this.isValidGeometry()) return 0;
    return this.polarMomentOfInertia / (this.dOut / 2);
  }

  getAnalysisReport() {
    if (!this.isValidGeometry()) {
      throw new Error("Geometría inválida.");
    }
    return {
      area_mm2: parseFloat(this.crossSectionArea.toFixed(2)),
      volume_cm3: parseFloat(this.volume.toFixed(2)),
      mass_kg: parseFloat(this.mass.toFixed(3)),
      polarMoment_mm4: parseFloat(this.polarMomentOfInertia.toFixed(2)),
      torsionalModulus_mm3: parseFloat(this.torsionalSectionModulus.toFixed(2)),
    };
  }
}
