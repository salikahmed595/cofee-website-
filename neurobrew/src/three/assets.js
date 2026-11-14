/* Procedural geometry, materials and shaders — no external models or textures. */
import * as THREE from 'three';

export const COLORS = {
  copper: new THREE.Color('#ff6a00'),
  raw: new THREE.Color('#a8915c'),
  mid: new THREE.Color('#9a5a28'),
  roasted: new THREE.Color('#3a1d0e'),
  espresso: new THREE.Color('#2a1206'),
  latte: new THREE.Color('#b78456'),
};

/* ---------- coffee bean ---------- */
export function beanGeometry() {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (v.y > 0) {
      v.y *= 0.55;
      const gx = v.x - 0.07 * Math.sin(v.z * 2.6);
      v.y -= 0.32 * Math.exp(-(gx * gx) / 0.006) * (1 - v.z * v.z * 0.85);
    }
    // subtle organic irregularity
    const n = Math.sin(v.x * 7.1 + v.z * 3.3) * Math.sin(v.z * 5.7) * 0.015;
    p.setXYZ(i, v.x * 0.64 * (1 + n), v.y * 0.5, v.z * 0.92 * (1 + n));
  }
  g.computeVertexNormals();
  return g;
}

/* ---------- gear (for the grinder mechanics) ---------- */
export function gearGeometry(teeth = 18, rOuter = 0.3, rRoot = 0.26, hole = 0.08, depth = 0.05) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [[a, rRoot], [a + step * 0.15, rOuter], [a + step * 0.45, rOuter], [a + step * 0.6, rRoot]];
    pts.forEach(([ang, r], j) => {
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0 && j === 0) s.moveTo(x, y); else s.lineTo(x, y);
    });
  }
  s.closePath();
  const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1, curveSegments: 8 });
  g.center();
  return g;
}

/* ---------- lathe helper ---------- */
export const lathe = (pts, seg = 96) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

/* ---------- materials ---------- */
export function makeMaterials(high) {
  const glass = high
    ? new THREE.MeshPhysicalMaterial({ transmission: 1, thickness: 0.12, roughness: 0.04, ior: 1.45, metalness: 0, color: '#ffffff', envMapIntensity: 1.4, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.05 })
    : new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, color: '#ffffff', envMapIntensity: 2, depthWrite: false });
  return {
    glass,
    darkMetal: new THREE.MeshStandardMaterial({ color: '#141210', metalness: 0.75, roughness: 0.42 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#c9c4bd', metalness: 1, roughness: 0.16 }),
    steel: new THREE.MeshStandardMaterial({ color: '#8b857d', metalness: 1, roughness: 0.32 }),
    copper: new THREE.MeshStandardMaterial({ color: '#d8692a', metalness: 1, roughness: 0.24 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#0c0b0a', metalness: 0, roughness: 0.7 }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6a00').multiplyScalar(5), toneMapped: false }),
    grounds: new THREE.MeshStandardMaterial({ color: '#3a2112', roughness: 0.95, metalness: 0 }),
  };
}

/* ---------- soft round sprite for particles ---------- */
let spriteTex;
export function softSprite() {
  if (spriteTex) return spriteTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  spriteTex = new THREE.CanvasTexture(c);
  return spriteTex;
}

/* ---------- grinder screen texture ---------- */
export function screenTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const x = c.getContext('2d');
  x.fillStyle = '#07090a'; x.fillRect(0, 0, 512, 320);
  x.strokeStyle = 'rgba(255,122,46,.9)'; x.lineWidth = 6;
  x.beginPath(); x.arc(120, 160, 78, -Math.PI / 2, Math.PI * 1.15); x.stroke();
  x.strokeStyle = 'rgba(255,122,46,.25)'; x.lineWidth = 2;
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; x.beginPath(); x.moveTo(120 + Math.cos(a) * 92, 160 + Math.sin(a) * 92); x.lineTo(120 + Math.cos(a) * 100, 160 + Math.sin(a) * 100); x.stroke(); }
  x.fillStyle = '#f2e6da'; x.font = '600 30px Sora, sans-serif'; x.fillText('GRINDING', 236, 118);
  x.font = '300 74px Sora, sans-serif'; x.fillText('12.5', 236, 200);
  x.font = '400 26px Sora, sans-serif'; x.fillStyle = 'rgba(242,230,218,.6)'; x.fillText('µm   GRIND SIZE', 236, 244);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function labelTexture(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 512, 96);
  x.font = '500 44px Sora, sans-serif'; x.fillStyle = '#d8cfc6'; x.fillText(text, 10, 64);
  x.fillStyle = '#ff7a2e'; x.font = '700 44px Sora, sans-serif'; x.fillText('////', 400, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- shaders ---------- */
const NOISE = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}`;

export function latteMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uArt: { value: 0 }, uMilk: { value: 0 },
      uCoffee: { value: COLORS.espresso.clone() }, uLatte: { value: COLORS.latte.clone() },
      uCrema: { value: new THREE.Color('#b8743c') }, uFoam: { value: new THREE.Color('#f6eee2') },
    },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float uTime,uArt,uMilk;uniform vec3 uCoffee,uLatte,uCrema,uFoam;varying vec2 vUv;${NOISE}
void main(){
  vec2 p=vUv*2.-1.;float r=length(p);float t=uTime*.1;
  float ang=atan(p.y,p.x)+(1.-r)*.8*sin(t);vec2 w=vec2(cos(ang),sin(ang))*r;
  float n=fbm(w*3.+t);
  vec3 base=mix(uCoffee,uLatte,uMilk);
  vec3 crema=mix(uCrema,uLatte,uMilk*.6);
  vec3 col=mix(crema,base,smoothstep(.15,1.05,r+(n-.5)*.4));
  vec2 h=w*1.45;h.y=-h.y+.05;
  float hd=length(vec2(h.x,h.y*1.12-sqrt(abs(h.x))*.62));
  float g=max(uArt,.001);
  float inside=smoothstep(.68*g,.6*g,hd);
  float layers=smoothstep(.3,.62,sin(hd*24.-.4)*.5+.5);
  float foam=inside*mix(1.,layers,smoothstep(.12,.5,hd));
  foam=max(foam,smoothstep(.8,.97,r)*.55*uMilk);
  col=mix(col,uFoam*(.9+.1*n),clamp(foam,0.,1.));
  col*=mix(1.,.55,smoothstep(.9,1.,r));
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
}

export function streamMaterial(color, highlight) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uHi: { value: new THREE.Color(highlight) } },
    vertexShader: `uniform float uTime;varying vec2 vUv;varying float vF;
void main(){vUv=uv;vec3 p=position;p.x+=sin(p.y*9.+uTime*7.)*.004;vec4 mv=modelViewMatrix*vec4(p,1.);
vec3 n=normalize(normalMatrix*normal);vF=pow(1.-abs(dot(n,normalize(-mv.xyz))),1.3);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;uniform vec3 uColor,uHi;varying vec2 vUv;varying float vF;
void main(){float flow=sin(vUv.y*80.+uTime*24.)*.5+.5;vec3 c=mix(uColor,uHi,vF*.75);c+=uHi*smoothstep(.8,1.,1.-vF)*(.25+flow*.1);
gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
  });
}
