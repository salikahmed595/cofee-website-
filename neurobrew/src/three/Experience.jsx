/* The single persistent 3D world. Every stage reuses the same beans, machine, cup,
   lights and camera; scroll progress only moves things through it. */
import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, advance } from '@react-three/fiber';
import { Environment, Lightformer, RoundedBox, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { journey } from '../lib/store.js';
import { cameraAt, beanState, brewState, RIG } from '../lib/journey.js';
import {
  COLORS, beanGeometry, gearGeometry, lathe, makeMaterials, softSprite, screenTexture,
  labelTexture, latteMaterial, streamMaterial,
} from './assets.js';

const clock = (state) => (journey.reduced ? 0.0 : state.clock.elapsedTime);
const UP = new THREE.Vector3(0, 1, 0);

/* ---------- camera ---------- */
function CameraRig() {
  const { camera, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    // journey.smooth is damped by the UI ticker (App.jsx) so HUD and 3D stay in lockstep.
    const portrait = size.width < 820 || size.width / size.height < 0.9;
    const c = cameraAt(journey.smooth, portrait);
    const par = journey.reduced || portrait ? 0 : 1;
    camera.position.set(c.position[0] + state.pointer.x * 0.22 * par, c.position[1] + state.pointer.y * 0.12 * par, c.position[2]);
    look.set(c.target[0], c.target[1], c.target[2]);
    camera.lookAt(look);
  });
  return null;
}

/* ---------- beans (instanced) ---------- */
function Beans({ count }) {
  const ref = useRef();
  const geo = useMemo(beanGeometry, []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35, envMapIntensity: 1 }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  useLayoutEffect(() => { for (let i = 0; i < count; i++) ref.current.setColorAt(i, COLORS.raw); }, [count]);
  useFrame((state) => {
    const p = journey.smooth, t = clock(state), m = ref.current;
    for (let i = 0; i < count; i++) {
      const s = beanState(i, count, p, t);
      dummy.position.set(s.pos[0], s.pos[1], s.pos[2]);
      dummy.rotation.set(s.rot[0], s.rot[1], s.rot[2]);
      dummy.scale.setScalar(Math.max(s.scale, 1e-4));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (s.roast < 0.5) col.copy(COLORS.raw).lerp(COLORS.mid, s.roast * 2);
      else col.copy(COLORS.mid).lerp(COLORS.roasted, (s.roast - 0.5) * 2);
      m.setColorAt(i, col);
    }
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />;
}

/* ---------- hero bean with copper orbit ---------- */
function HeroBean() {
  const g = useRef(), bean = useRef(), ring = useRef(), dots = useRef();
  const geo = useMemo(beanGeometry, []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: COLORS.raw.clone(), roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.3 }), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a12').multiplyScalar(6.5), toneMapped: false, transparent: true }), []);
  const dotGeo = useMemo(() => {
    const n = 260, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, r = 1.05 + (Math.random() - 0.5) * 0.08;
      arr.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.04, Math.sin(a) * r], i * 3);
    }
    const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.BufferAttribute(arr, 3)); return b;
  }, []);
  const dotMat = useMemo(() => new THREE.PointsMaterial({ size: 0.025, map: softSprite(), color: new THREE.Color('#ffb070').multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), []);
  const from = useMemo(() => new THREE.Vector3(0.95, 5.45, 1.4), []);
  const to = useMemo(() => new THREE.Vector3(0, RIG.chamber.y - 0.2, 0), []);
  useFrame((state) => {
    const p = journey.smooth, t = clock(state), b = brewState(p).heroBean;
    g.current.position.lerpVectors(from, to, b);
    g.current.position.y += Math.sin(Math.PI * b) * 0.9 + Math.sin(t * 0.8) * 0.05 * (1 - b);
    const s = THREE.MathUtils.lerp(0.62, 0.15, b) * (b >= 0.999 ? 0 : 1);
    bean.current.scale.setScalar(Math.max(s, 1e-4));
    bean.current.rotation.set(0.5 + t * 0.12, t * 0.25, -0.5 + b * 3);
    const fade = 1 - Math.min(1, b * 2.5);
    ringMat.opacity = fade; dotMat.opacity = fade;
    ring.current.visible = dots.current.visible = fade > 0.01;
    ring.current.rotation.z = t * 0.15; dots.current.rotation.y = -t * 0.2;
    const roastC = THREE.MathUtils.clamp((p - 1.0) / 0.8, 0, 1);
    mat.color.copy(COLORS.raw).lerp(COLORS.roasted, roastC);
  });
  return (
    <group ref={g}>
      <mesh ref={bean} geometry={geo} material={mat} />
      <group rotation={[1.2, 0.2, -0.45]}>
        <mesh ref={ring} material={ringMat}><torusGeometry args={[1.05, 0.0045, 8, 220]} /></mesh>
        <points ref={dots} geometry={dotGeo} material={dotMat} />
      </group>
    </group>
  );
}

/* ---------- the machine (roaster → grinder → brewer → pedestal) ---------- */
function Machine({ mats }) {
  const coil = useRef(), chamberLight = useRef(), burr = useRef(), gearA = useRef(), gearB = useRef(),
    mound = useRef(), strips = useRef([]), rings = useRef([]), screenMat = useRef(), cupLight = useRef(), spot = useRef(), shower = useRef();
  const gearSmall = useMemo(() => gearGeometry(14, 0.17, 0.145, 0.04, 0.04), []);
  const gearBig = useMemo(() => gearGeometry(22, 0.3, 0.27, 0.07, 0.05), []);
  const burrGeo = useMemo(() => gearGeometry(24, 0.24, 0.205, 0.05, 0.06), []);
  const screen = useMemo(screenTexture, []);
  const label = useMemo(() => labelTexture('ROASTING'), []);
  const glowMats = useMemo(() => Array.from({ length: 6 }, () => new THREE.MeshBasicMaterial({ color: '#ff7a2e', toneMapped: false })), []);
  const coilMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff5a1a', toneMapped: false }), []);
  const ringMats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: '#ff7a2e', toneMapped: false })), []);
  const hot = useMemo(() => new THREE.Color('#ff6a00'), []);

  useFrame((state, dt) => {
    const p = journey.smooth, t = clock(state), b = brewState(p);
    const dim = 1 - b.final * 0.7;
    const on = (0.15 + 0.85 * b.reveal) * dim;
    glowMats.forEach((m, i) => m.color.copy(hot).multiplyScalar((i < 2 ? 2.4 : 3.2) * on));
    coilMat.color.copy(hot).multiplyScalar(0.2 + b.heat * 7);
    chamberLight.current.intensity = b.heat * 26;
    const spin = journey.reduced ? 0 : dt;
    burr.current.rotation.z += spin * 22 * b.grind;
    gearA.current.rotation.z += spin * 6 * (b.grind + 0.05 * b.reveal);
    gearB.current.rotation.z -= spin * 6 * (22 / 14) * (b.grind + 0.05 * b.reveal);
    mound.current.scale.set(1, Math.max(b.mound, 0.001), 1);
    mound.current.visible = b.mound > 0.01 && b.final < 0.98;
    ringMats.forEach((m, i) => m.color.copy(hot).multiplyScalar((0.35 + b.final * 3.4 + b.espresso * 0.8) * (1 - i * 0.22) * (0.3 + 0.7 * b.reveal)));
    cupLight.current.intensity = 1 + b.final * 2.5 + b.espresso * 2;
    screenMat.current.emissiveIntensity = 0.25 + 1.6 * on;
    spot.current.intensity = 260 * on;
    shower.current.color.copy(hot).multiplyScalar(0.3 + b.water * 4);
  });

  const C = RIG.chamber;
  return (
    <group>
      {/* spine */}
      <RoundedBox args={[1.9, 7.4, 0.5]} radius={0.18} smoothness={3} position={[0, 2.6, -1.3]} material={mats.darkMetal} />
      <mesh position={[-0.86, 2.6, -1.04]} material={glowMats[0]}><boxGeometry args={[0.02, 7, 0.02]} /></mesh>
      <mesh position={[0.86, 2.6, -1.04]} material={glowMats[1]}><boxGeometry args={[0.02, 7, 0.02]} /></mesh>
      <spotLight ref={spot} position={[2.5, 7, 5]} angle={0.5} penumbra={0.9} distance={20} color="#ffd2a8" target-position={[0, 2.5, 0]} />

      {/* roasting chamber */}
      <group position={[0, C.y, 0]}>
        <mesh material={mats.glass}><cylinderGeometry args={[C.r, C.r, C.h, 64, 1, true]} /></mesh>
        <mesh position={[0, C.h / 2 + 0.12, 0]} material={mats.darkMetal}><cylinderGeometry args={[C.r + 0.1, C.r + 0.12, 0.24, 64]} /></mesh>
        <mesh position={[0, C.h / 2 + 0.3, 0]} material={mats.steel}><cylinderGeometry args={[0.35, C.r + 0.02, 0.18, 48]} /></mesh>
        <mesh position={[0, -C.h / 2 - 0.12, 0]} material={mats.darkMetal}><cylinderGeometry args={[C.r + 0.12, C.r + 0.05, 0.24, 64]} /></mesh>
        <mesh position={[0, C.h / 2, 0]} rotation-x={Math.PI / 2} material={glowMats[2]}><torusGeometry args={[C.r + 0.03, 0.012, 8, 128]} /></mesh>
        <mesh position={[0, -C.h / 2, 0]} rotation-x={Math.PI / 2} material={glowMats[3]}><torusGeometry args={[C.r + 0.03, 0.012, 8, 128]} /></mesh>
        <mesh ref={coil} position={[0, -C.h / 2 + 0.06, 0]} rotation-x={Math.PI / 2} material={coilMat}><torusGeometry args={[0.55, 0.025, 8, 96]} /></mesh>
        <mesh position={[0, -C.h / 2 + 0.06, 0]} rotation-x={Math.PI / 2} material={coilMat}><torusGeometry args={[0.32, 0.02, 8, 64]} /></mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.cos(i * Math.PI / 2 + 0.785) * (C.r + 0.06), 0, Math.sin(i * Math.PI / 2 + 0.785) * (C.r + 0.06)]} material={mats.steel}>
            <cylinderGeometry args={[0.025, 0.025, C.h, 12]} />
          </mesh>
        ))}
        <mesh position={[0, C.h / 2 + 0.12, C.r + 0.125]}>
          <planeGeometry args={[0.9, 0.17]} />
          <meshBasicMaterial map={label} transparent toneMapped={false} />
        </mesh>
        <pointLight ref={chamberLight} position={[0, -0.25, 0]} color="#ff7a2e" distance={6} decay={2} />
        {/* arm into the spine */}
        <mesh position={[0, 0, -0.95]} material={mats.darkMetal}><boxGeometry args={[0.7, 0.5, 0.5]} /></mesh>
      </group>

      {/* chute + hopper */}
      <mesh position={[0, 4.15, 0]} material={mats.glass}><cylinderGeometry args={[0.16, 0.16, 0.6, 32, 1, true]} /></mesh>
      <mesh position={[0, 3.55, 0]} material={mats.glass}><cylinderGeometry args={[0.7, 0.2, 0.6, 64, 1, true]} /></mesh>
      <mesh position={[0, RIG.hopper.top, 0]} rotation-x={Math.PI / 2} material={mats.copper}><torusGeometry args={[0.7, 0.02, 10, 96]} /></mesh>

      {/* burr collar */}
      <mesh position={[0, RIG.burrY, 0]} material={mats.glass}><cylinderGeometry args={[0.3, 0.3, 0.22, 48, 1, true]} /></mesh>
      <mesh ref={burr} position={[0, RIG.burrY, 0]} rotation-x={Math.PI / 2} geometry={burrGeo} material={mats.steel} />

      {/* grinder body */}
      <RoundedBox args={[1.5, 1.05, 1.3]} radius={0.12} smoothness={3} position={[0, RIG.grinder.y, 0]} material={mats.darkMetal} />
      <mesh position={[0, RIG.grinder.y, -0.85]} material={mats.darkMetal}><boxGeometry args={[0.9, 0.7, 0.5]} /></mesh>
      <mesh position={[0.05, RIG.grinder.y + 0.05, 0.655]}>
        <planeGeometry args={[0.72, 0.45]} />
        <meshStandardMaterial ref={screenMat} map={screen} emissiveMap={screen} emissive="#ffffff" roughness={0.2} metalness={0} />
      </mesh>
      <mesh position={[0, RIG.grinder.y - 0.5, 0.66]} material={glowMats[4]}><boxGeometry args={[1.3, 0.012, 0.012]} /></mesh>
      {/* exposed gear train on the side */}
      <group position={[0.77, RIG.grinder.y + 0.05, 0.15]} rotation-y={Math.PI / 2}>
        <mesh ref={gearA} position={[0, 0.02, 0]} geometry={gearBig} material={mats.copper} />
        <mesh ref={gearB} position={[0.43, -0.12, 0]} geometry={gearSmall} material={mats.steel} />
      </group>

      {/* shower screen + glass dose basket + grounds */}
      <mesh position={[0, 1.8, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.36, 0.018, 8, 64]} />
        <meshBasicMaterial ref={shower} color="#ff7a2e" toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.52, 0]} material={mats.glass}><cylinderGeometry args={[0.38, 0.36, 0.5, 48, 1, true]} /></mesh>
      <mesh ref={mound} position={[0, 1.3, 0]} material={mats.grounds}>
        <cylinderGeometry args={[0.04, 0.34, 0.3, 32]} />
      </mesh>
      {/* portafilter */}
      <mesh position={[0, 1.2, 0]} material={mats.chrome}><cylinderGeometry args={[0.42, 0.34, 0.16, 48]} /></mesh>
      <mesh position={[0.78, 1.18, 0.25]} rotation={[0, -0.32, Math.PI / 2 - 0.08]} material={mats.chrome}><cylinderGeometry args={[0.05, 0.06, 0.8, 16]} /></mesh>
      <mesh position={[1.28, 1.15, 0.42]} rotation={[0, -0.32, Math.PI / 2 - 0.08]} material={mats.rubber}><cylinderGeometry args={[0.065, 0.07, 0.42, 16]} /></mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, RIG.spoutY + 0.06, 0]} material={mats.chrome}><cylinderGeometry args={[0.025, 0.03, 0.12, 12]} /></mesh>
      ))}

      {/* pedestal / drip tray with glowing rings */}
      <mesh position={[0, RIG.cup.base - 0.04, 0]} material={mats.darkMetal}><cylinderGeometry args={[1.25, 1.3, 0.08, 96]} /></mesh>
      {[0.68, 0.92, 1.18].map((r, i) => (
        <mesh key={r} position={[0, RIG.cup.base + 0.003, 0]} rotation-x={-Math.PI / 2} material={ringMats[i]}>
          <ringGeometry args={[r, r + 0.012, 128]} />
        </mesh>
      ))}
      <pointLight ref={cupLight} position={[0.2, RIG.cup.base + 0.35, -0.95]} color="#ff7a2e" distance={4} decay={2} />
    </group>
  );
}

/* ---------- glass cup, liquid, latte art, espresso streams, steam ---------- */
const surfaceY = (level) => RIG.cup.base + 0.06 + level * (RIG.cup.h - 0.1);

function Cup({ mats }) {
  const g = useRef(), liquid = useRef(), surface = useRef(), streams = useRef([]), steam = useRef([]);
  const body = useMemo(() => lathe([[0, 0], [0.42, 0], [0.48, 0.02], [0.5, 0.08], [0.5, RIG.cup.h], [0.485, RIG.cup.h + 0.012], [0.47, RIG.cup.h], [0.47, 0.07], [0.44, 0.055], [0, 0.055]], 96), []);
  const handle = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.49, 0.62, 0), new THREE.Vector3(0.78, 0.6, 0), new THREE.Vector3(0.84, 0.38, 0), new THREE.Vector3(0.74, 0.2, 0), new THREE.Vector3(0.49, 0.18, 0),
  ]), 48, 0.035, 12, false), []);
  const liquidMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: COLORS.espresso.clone(), roughness: 0.4, clearcoat: 0.3 }), []);
  const latte = useMemo(latteMaterial, []);
  const stream = useMemo(() => streamMaterial('#3a1a08', '#c77a36'), []);
  const steamMat = useMemo(() => Array.from({ length: 12 }, () => new THREE.SpriteMaterial({ map: softSprite(), color: '#f3e3d2', transparent: true, depthWrite: false, opacity: 0 })), []);
  const seeds = useMemo(() => steamMat.map((_, i) => ({ off: i / 12, seed: Math.random() * 10, side: (Math.random() - 0.5) * 0.4 })), [steamMat]);
  const angle = useRef(0);

  useFrame((state, dt) => {
    const p = journey.smooth, t = clock(state), b = brewState(p);
    const lvl = Math.max(b.level, 0.0001);
    liquid.current.scale.set(1, lvl * (RIG.cup.h - 0.1), 1);
    liquid.current.visible = b.level > 0.01;
    liquidMat.color.copy(COLORS.espresso).lerp(COLORS.latte, b.milk * 0.42);
    surface.current.position.y = surfaceY(lvl) - RIG.cup.base;
    surface.current.visible = b.level > 0.01;
    latte.uniforms.uTime.value = t; latte.uniforms.uArt.value = b.art; latte.uniforms.uMilk.value = b.milk;
    stream.uniforms.uTime.value = t;
    const top = RIG.spoutY, bottom = surfaceY(lvl);
    streams.current.forEach((s) => {
      s.visible = b.espresso > 0.01;
      s.position.y = bottom;
      s.scale.set(Math.max(b.espresso, 0.01), Math.max(top - bottom, 0.01), Math.max(b.espresso, 0.01));
    });
    if (!journey.reduced) angle.current += dt * 0.35 * b.final;
    g.current.rotation.y = angle.current;
    steam.current.forEach((sp, i) => {
      const u = seeds[i], life = (t * 0.12 + u.off) % 1;
      sp.position.set(u.side + Math.sin(t * 0.8 + u.seed) * 0.12 * life, RIG.cup.h + 0.05 + life * 1.3, Math.cos(t * 0.6 + u.seed) * 0.1);
      const s = 0.25 + life * 0.8; sp.scale.set(s, s, s);
      steamMat[i].opacity = Math.sin(life * Math.PI) * 0.3 * b.steam * (journey.reduced ? 0.5 : 1);
    });
  });

  return (
    <>
      <group ref={g} position={[0, RIG.cup.base, 0]}>
        <mesh geometry={body} material={mats.glass} />
        <mesh geometry={handle} material={mats.glass} />
        <mesh ref={liquid} position={[0, 0.06, 0]} material={liquidMat}>
          <cylinderGeometry args={[RIG.cup.inner, RIG.cup.inner - 0.01, 1, 64]} onUpdate={(geo) => geo.translate(0, 0.5, 0)} />
        </mesh>
        <mesh ref={surface} rotation-x={-Math.PI / 2} material={latte}><circleGeometry args={[RIG.cup.inner, 96]} /></mesh>
      </group>
      <group position={[0, RIG.cup.base, 0]}>
        {steamMat.map((m, i) => <sprite key={i} ref={(el) => (steam.current[i] = el)} material={m} />)}
      </group>
      {[-0.07, 0.07].map((x, i) => (
        <mesh key={x} ref={(el) => (streams.current[i] = el)} position={[x * 0.6, 0, 0]} material={stream}>
          <cylinderGeometry args={[0.012, 0.016, 1, 12, 24, true]} onUpdate={(geo) => geo.translate(0, 0.5, 0)} />
        </mesh>
      ))}
    </>
  );
}

/* ---------- milk pitcher + milk stream ---------- */
function Pitcher({ mats }) {
  const g = useRef(), milk = useRef();
  const body = useMemo(() => lathe([[0, 0], [0.3, 0], [0.33, 0.04], [0.345, 0.25], [0.32, 0.5], [0.3, 0.62], [0.31, 0.64]], 64), []);
  const handle = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.33, 0.5, 0), new THREE.Vector3(0.55, 0.48, 0), new THREE.Vector3(0.56, 0.2, 0), new THREE.Vector3(0.34, 0.12, 0),
  ]), 32, 0.035, 10, false), []);
  const milkMat = useMemo(() => streamMaterial('#e9e1d6', '#ffffff'), []);
  const off = useMemo(() => new THREE.Vector3(3.4, 2.0, 0.6), []);
  const on = useMemo(() => new THREE.Vector3(0.95, 0.42, 0.12), []);
  const spoutLocal = useMemo(() => new THREE.Vector3(-0.34, 0.63, 0), []);
  const a = useMemo(() => new THREE.Vector3(), []), d = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const p = journey.smooth, b = brewState(p);
    g.current.position.lerpVectors(off, on, b.pitcherIn);
    g.current.rotation.set(0, 0.25, b.pitcherTilt * 1.05);
    g.current.visible = b.pitcherIn > 0.001;
    milkMat.uniforms.uTime.value = clock(state);
    g.current.updateMatrixWorld();
    a.copy(spoutLocal).applyMatrix4(g.current.matrixWorld);
    const end = new THREE.Vector3(0.04, surfaceY(b.level), 0.02);
    d.subVectors(a, end);
    const len = d.length();
    milk.current.visible = b.milkStream > 0.01;
    milk.current.position.copy(end);
    milk.current.quaternion.setFromUnitVectors(UP, d.normalize());
    const th = Math.max(b.milkStream, 0.01);
    milk.current.scale.set(th, len, th);
  });
  return (
    <>
      <group ref={g}>
        <mesh geometry={body} material={mats.chrome}><meshStandardMaterial attach="material" color="#d8d3cc" metalness={1} roughness={0.14} side={THREE.DoubleSide} /></mesh>
        <mesh geometry={handle} material={mats.chrome} />
        <mesh position={[-0.33, 0.6, 0]} rotation-z={0.6} material={mats.chrome}><coneGeometry args={[0.07, 0.16, 16, 1, true]} /></mesh>
      </group>
      <mesh ref={milk} material={milkMat}>
        <cylinderGeometry args={[0.03, 0.045, 1, 16, 24, true]} onUpdate={(geo) => geo.translate(0, 0.5, 0)} />
      </mesh>
    </>
  );
}

/* ---------- particles: embers, grounds, water, dust ---------- */
function useCloud(n, init) {
  return useMemo(() => {
    const arr = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { init(arr, i); seed[i] = Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return { g, arr, seed };
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Particles({ high }) {
  const N = high ? 1 : 0.45;
  const nE = Math.round(180 * N), nG = Math.round(320 * N), nW = Math.round(90 * N), nD = Math.round(420 * N);
  const embers = useCloud(nE, () => {}), grounds = useCloud(nG, () => {}), water = useCloud(nW, () => {});
  const dust = useCloud(nD, (a, i) => a.set([(Math.random() - 0.5) * 12, -1 + Math.random() * 8, (Math.random() - 0.5) * 8], i * 3));
  const mk = (color, size, additive) => new THREE.PointsMaterial({ map: softSprite(), color: new THREE.Color(color), size, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: !additive, opacity: 0 });
  const mE = useMemo(() => mk('#ff8a3a', 0.045, true), []), mG = useMemo(() => mk('#4a2814', 0.03, false), []);
  const mW = useMemo(() => mk('#cfe6ff', 0.025, true), []), mD = useMemo(() => mk('#ffb37a', 0.022, true), []);

  useFrame((state) => {
    const t = clock(state), b = brewState(journey.smooth), C = RIG.chamber;
    mE.opacity = b.heat * 0.9; mG.opacity = b.grounds; mW.opacity = b.water * 0.8; mD.opacity = 0.35;
    for (let i = 0; i < nE; i++) {
      const s = embers.seed[i], life = (t * (0.25 + s * 0.3) + s) % 1, a = s * 40 + t * 0.4;
      embers.arr.set([Math.cos(a) * (0.1 + s * 0.6), C.y - C.h / 2 + life * C.h, Math.sin(a) * (0.1 + s * 0.6)], i * 3);
    }
    for (let i = 0; i < nG; i++) {
      const s = grounds.seed[i], life = (t * (0.9 + s * 0.6) + s) % 1, a = s * 50;
      grounds.arr.set([Math.cos(a) * life * 0.12 * s, 1.85 - life * 0.42, Math.sin(a) * life * 0.12 * s], i * 3);
    }
    for (let i = 0; i < nW; i++) {
      const s = water.seed[i], life = (t * (1.2 + s) + s) % 1, a = s * 30;
      water.arr.set([Math.cos(a) * 0.3 * s, 1.78 - life * 0.2, Math.sin(a) * 0.3 * s], i * 3);
    }
    for (let i = 0; i < nD; i++) dust.arr[i * 3 + 1] += Math.sin(t * 0.3 + dust.seed[i] * 9) * 0.0008;
    [embers, grounds, water, dust].forEach((c) => (c.g.attributes.position.needsUpdate = true));
  });
  return (
    <>
      <points geometry={embers.g} material={mE} frustumCulled={false} />
      <points geometry={grounds.g} material={mG} frustumCulled={false} />
      <points geometry={water.g} material={mW} frustumCulled={false} />
      <points geometry={dust.g} material={mD} frustumCulled={false} />
    </>
  );
}

function Table() {
  return (
    <mesh position={[0, RIG.tableY - 0.02, 0]} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[14, 64]} />
      <meshStandardMaterial color="#0b0908" metalness={0.4} roughness={0.42} />
    </mesh>
  );
}

function Scene({ high }) {
  const mats = useMemo(() => makeMaterials(high), [high]);
  return (
    <>
      <color attach="background" args={['#0a0807']} />
      <fog attach="fog" args={['#090504', 8, 20]} />
      <CameraRig />
      <ambientLight intensity={0.12} />
      <spotLight position={[-5, 9, 6]} angle={0.55} penumbra={0.8} intensity={520} distance={30} color="#ffe2c4" target-position={[0, 4, 0]} />
      <directionalLight position={[6, 4, -6]} intensity={4.2} color="#ff6a00" />
      <directionalLight position={[-6, 3, -5]} intensity={1.3} color="#ffb27a" />
      <pointLight position={[2.5, 1.5, 6]} intensity={22} color="#fff0e0" distance={20} decay={2} />
      <Environment resolution={high ? 256 : 64} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ffd9b0" position={[-4, 6, 4]} scale={[6, 3, 1]} target={[0, 2, 0]} />
        <Lightformer form="rect" intensity={4} color="#ff6a00" position={[6, 3, -3]} scale={[1, 8, 1]} target={[0, 2, 0]} />
        <Lightformer form="ring" intensity={1.4} color="#ffb070" position={[0, -2, 5]} scale={4} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1} color="#ffffff" position={[-6, 2, -4]} scale={[1, 6, 1]} target={[0, 2, 0]} />
      </Environment>
      <Beans count={high ? 110 : 40} />
      <HeroBean />
      <Machine mats={mats} />
      <Cup mats={mats} />
      <Pitcher mats={mats} />
      <Particles high={high} />
      <Table />
    </>
  );
}

// Dev-only test hook: lets automated checks render frames on demand.
if (import.meta.env.DEV && typeof window !== 'undefined') window.__nb = { advance, journey };

export default function Experience({ quality, onReady, onDowngrade, onContextLost }) {
  const high = quality === 'high';
  return (
    <Canvas
      className="webgl"
      dpr={high ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: !high, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: 35, near: 0.1, far: 60, position: [0.2, 5.6, 7.4] }}
      onCreated={({ gl }) => {
        // If the GPU drops the context (low memory, driver reset), fall back to the static Lite art instead of a black screen.
        gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (onContextLost) onContextLost(); }, { once: true });
        if (onReady) onReady();
      }}
    >
      <PerformanceMonitor onDecline={() => onDowngrade && onDowngrade()} />
      <Scene high={high} />
      {high && (
        <EffectComposer multisampling={4} disableNormalPass>
          <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.82} luminanceSmoothing={0.22} />
          <Vignette offset={0.28} darkness={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
