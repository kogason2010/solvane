import * as THREE from 'three';
import { ELEMENT_STYLE, type Molecule } from './molecules';

const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const offset = new THREE.Vector3();

export const atomGeometry = () => new THREE.SphereGeometry(1, 28, 20);
export const bondGeometry = () => new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);

/** Number of bond cylinders (double bonds use two). */
export function bondInstanceCount(m: Molecule) {
  return m.bonds.reduce((s, b) => s + b.order, 0);
}

/** Write a bond cylinder (or a pair for double bonds) between two points into an instanced mesh. */
export function writeBond(
  mesh: THREE.InstancedMesh,
  index: number,
  a: THREE.Vector3,
  b: THREE.Vector3,
  order: 1 | 2,
  radius: number,
  matrix: THREE.Matrix4 | null,
  viewHint: THREE.Vector3,
) {
  tmpDir.subVectors(b, a);
  const len = tmpDir.length();
  tmpDir.normalize();
  tmpQ.setFromUnitVectors(UP, tmpDir);
  // perpendicular used to offset the second line of a double bond
  offset.crossVectors(tmpDir, viewHint).normalize().multiplyScalar(radius * 1.6);
  const n = order;
  for (let k = 0; k < n; k++) {
    const shift = n === 2 ? (k === 0 ? 1 : -1) : 0;
    tmpA.copy(a).addScaledVector(offset, shift).lerp(tmpB.copy(b).addScaledVector(offset, shift), 0.5);
    tmpS.set(n === 2 ? radius * 0.7 : radius, len, n === 2 ? radius * 0.7 : radius);
    tmpM.compose(tmpA, tmpQ, tmpS);
    if (matrix) tmpM.premultiply(matrix);
    mesh.setMatrixAt(index + k, tmpM);
  }
  return index + n;
}

/**
 * Static instanced copies of a molecule (used for the background field).
 * Returns atom + bond meshes sharing geometry/material.
 */
export function buildField(
  mol: Molecule,
  transforms: THREE.Matrix4[],
  atomGeo: THREE.BufferGeometry,
  bondGeo: THREE.BufferGeometry,
  atomMat: THREE.Material,
  bondMat: THREE.Material,
) {
  const atomCount = mol.atoms.length * transforms.length;
  const bondCount = bondInstanceCount(mol) * transforms.length;
  const atoms = new THREE.InstancedMesh(atomGeo, atomMat, atomCount);
  const bonds = new THREE.InstancedMesh(bondGeo, bondMat, bondCount);
  const color = new THREE.Color();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const m = new THREE.Matrix4();
  let ai = 0;
  let bi = 0;
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  for (const T of transforms) {
    for (const a of mol.atoms) {
      const st = ELEMENT_STYLE[a.el];
      p.set(a.p[0], a.p[1], a.p[2]);
      s.setScalar(st.r);
      m.compose(p, q, s).premultiply(T);
      atoms.setMatrixAt(ai, m);
      atoms.setColorAt(ai, color.set(st.color));
      ai++;
    }
    for (const b of mol.bonds) {
      pa.fromArray(mol.atoms[b.a].p);
      pb.fromArray(mol.atoms[b.b].p);
      bi = writeBond(bonds, bi, pa, pb, b.order, 0.075, T, new THREE.Vector3(0, 0, 1));
    }
  }
  atoms.instanceMatrix.needsUpdate = true;
  if (atoms.instanceColor) atoms.instanceColor.needsUpdate = true;
  bonds.instanceMatrix.needsUpdate = true;
  atoms.frustumCulled = false;
  bonds.frustumCulled = false;
  return { atoms, bonds };
}
