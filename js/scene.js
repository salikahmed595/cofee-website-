/* SalikBuilds — procedural 3D coffee scene (Three.js r128). No external models or textures. */
(function () {
  'use strict';
  var T = window.THREE;

  // Animated by scroll (GSAP writes into this object).
  var S = { x: 1.25, y: -0.25, z: 0, rx: 0.2, ry: -0.5, scale: 1, spread: 1, beanScale: 1, pour: 1, intro: 0, turn: 0 };
  // Drink look, set by the configurator; rendered values ease toward the target.
  var target = { coffee: new T.Color('#5a3520'), foam: 0.85, steam: 1, ice: 0, size: 1 };
  var look = { coffee: target.coffee.clone(), foam: 0.85, steam: 1, ice: 0, size: 1 };

  var renderer, scene, camera, rig, cupGroup, beans, beanData = [], steam = [], ice = [];
  var coffeeMat, streamMat, stream, shadow, clock, turnAngle = 0;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isSmall = Math.min(window.innerWidth, window.innerHeight) < 700;
  var dummy = new T.Object3D();

  /* ---------- environment for glossy reflections ---------- */
  function makeEnv() {
    // Painted equirectangular "studio": dark warm room with a few softboxes.
    var c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#3a2a1e'); g.addColorStop(.5, '#1a120c'); g.addColorStop(1, '#0a0705');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    function soft(cx, cy, w, h, col) {
      x.save(); x.filter = 'blur(10px)'; x.fillStyle = col; x.fillRect(cx - w / 2, cy - h / 2, w, h); x.restore();
    }
    soft(380, 150, 220, 90, '#fff1dc');  // key softbox
    soft(820, 230, 50, 220, '#ffd2a0');  // warm rim strip
    soft(120, 210, 70, 160, '#f6e7d6');  // cool-ish fill strip
    soft(512, 470, 1024, 40, '#5a3a22'); // table bounce
    var tex = new T.CanvasTexture(c);
    tex.mapping = T.EquirectangularReflectionMapping;
    tex.encoding = T.sRGBEncoding;
    var pm = new T.PMREMGenerator(renderer);
    var env = pm.fromEquirectangular(tex).texture;
    pm.dispose(); tex.dispose();
    return env;
  }

  /* ---------- materials ---------- */
  function ceramic() {
    return new T.MeshPhysicalMaterial({ color: '#e9dfd2', roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 });
  }
  var gold = new T.MeshStandardMaterial({ color: '#d2a865', metalness: 1, roughness: 0.22, envMapIntensity: 1.4 });

  /* ---------- cup ---------- */
  function lathe(points, seg) {
    return new T.LatheGeometry(points.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg);
  }

  function buildCup() {
    var g = new T.Group();
    var mat = ceramic();
    var body = new T.Mesh(lathe([[0, .02], [.5, .02], [.56, .05], [.6, .12], [.72, .3], [.86, .6], [.98, .95], [1.04, 1.22],
      [1.055, 1.29], [1.03, 1.31], [1.0, 1.29], [.98, 1.2], [.92, .95], [.8, .6], [.66, .3], [.55, .2], [.3, .17], [0, .16]], 128), mat);
    g.add(body);

    var rim = new T.Mesh(new T.TorusGeometry(1.03, .013, 12, 160), gold);
    rim.rotation.x = Math.PI / 2; rim.position.y = 1.305; g.add(rim);

    var curve = new T.CatmullRomCurve3([new T.Vector3(.97, 1.05, 0), new T.Vector3(1.32, 1.1, 0), new T.Vector3(1.5, .86, 0),
      new T.Vector3(1.33, .56, 0), new T.Vector3(.76, .42, 0)]);
    var handle = new T.Mesh(new T.TubeGeometry(curve, 64, .07, 20, false), mat);
    handle.scale.z = .85; g.add(handle);

    var saucer = new T.Mesh(lathe([[0, -.02], [.55, -.02], [.62, -.06], [1.2, -.02], [1.55, .1], [1.62, .14], [1.6, .17], [1.52, .16],
      [1.2, .06], [.66, .0], [0, .0]], 128), mat);
    g.add(saucer);
    var sRim = new T.Mesh(new T.TorusGeometry(1.605, .011, 10, 180), gold);
    sRim.rotation.x = Math.PI / 2; sRim.position.y = .165; g.add(sRim);

    // Coffee surface with procedural crema + latte art
    coffeeMat = new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCoffee: { value: look.coffee }, uFoam: { value: look.foam } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: [
        'uniform float uTime;uniform vec3 uCoffee;uniform float uFoam;varying vec2 vUv;',
        'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}',
        'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}',
        'void main(){',
        ' vec2 p=vUv*2.-1.;float r=length(p);float t=uTime*.12;',
        ' float ang=atan(p.y,p.x)+(1.-r)*.9*sin(t);vec2 w=vec2(cos(ang),sin(ang))*r;',
        ' float n=fbm(w*3.+t);',
        ' vec3 crema=mix(uCoffee*2.2,vec3(.78,.55,.32),.45);',
        ' vec3 col=mix(crema,uCoffee,smoothstep(.1,1.05,r+(n-.5)*.35));',
        ' vec2 h=w*1.5;h.y=-h.y+.08;',
        ' float hx=abs(h.x);float hd=length(vec2(h.x,h.y*1.12-sqrt(hx)*.62));',
        ' float inside=smoothstep(.68,.62,hd);',
        ' float layers=smoothstep(.3,.62,sin(hd*24.-.4)*.5+.5);',
        ' float foam=inside*mix(1.,layers,smoothstep(.12,.5,hd));',
        ' foam=max(foam,smoothstep(.8,.97,r)*.5);',
        ' foam*=uFoam;',
        ' vec3 milk=vec3(.97,.92,.84)*(.88+.12*n);',
        ' col=mix(col,milk,clamp(foam,0.,1.));',
        ' col+=vec3(1.,.9,.75)*.16*smoothstep(.4,0.,length(p-vec2(-.35,.35)));',
        ' col*=mix(1.,.5,smoothstep(.9,1.,r));',
        ' gl_FragColor=vec4(col,1.);',
        '}'].join('\n')
    });
    var surface = new T.Mesh(new T.CircleGeometry(.955, 96), coffeeMat);
    surface.rotation.x = -Math.PI / 2; surface.position.y = 1.12; g.add(surface);

    // Ice cubes (shown when "Iced")
    var iceMat = new T.MeshPhysicalMaterial({ color: '#eaf4ff', roughness: .08, metalness: 0, clearcoat: 1, transparent: true, opacity: .55, envMapIntensity: 2 });
    var iceGeo = new T.BoxGeometry(.32, .26, .32);
    [[-.35, .2, .4], [.3, -.3, 1.1], [.12, .4, 2.2], [-.25, -.38, .7]].forEach(function (d) {
      var m = new T.Mesh(iceGeo, iceMat); m.position.set(d[0], 1.16, d[1]); m.rotation.set(.2, d[2], .15); m.scale.setScalar(0.001);
      g.add(m); ice.push(m);
    });

    // Pour stream
    streamMat = new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCoffee: { value: look.coffee } },
      vertexShader: 'uniform float uTime;varying vec2 vUv;varying float vF;void main(){vUv=uv;vec3 p=position;p.x+=sin(p.y*7.+uTime*6.)*.008;vec4 mv=modelViewMatrix*vec4(p,1.);vec3 n=normalize(normalMatrix*normal);vF=pow(1.-abs(dot(n,normalize(-mv.xyz))),1.4);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform float uTime;uniform vec3 uCoffee;varying vec2 vUv;varying float vF;void main(){float flow=sin(vUv.y*90.+uTime*26.)*.5+.5;vec3 c=mix(uCoffee*1.15,vec3(.62,.36,.16),vF*.8);c+=vec3(1.,.8,.55)*smoothstep(.75,1.,1.-vF)*(.18+flow*.06);gl_FragColor=vec4(c,1.);}'
    });
    var sg = new T.CylinderGeometry(.032, .046, 1, 24, 40, true); sg.translate(0, .5, 0);
    stream = new T.Mesh(sg, streamMat); stream.position.set(0, 1.12, 0); g.add(stream);

    // Steam sprites
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'); var grd = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,240,225,.55)'); grd.addColorStop(.5, 'rgba(255,235,215,.16)'); grd.addColorStop(1, 'rgba(255,235,215,0)');
    x.fillStyle = grd; x.fillRect(0, 0, 128, 128);
    var steamTex = new T.CanvasTexture(c);
    for (var i = 0; i < 14; i++) {
      var sp = new T.Sprite(new T.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
      sp.userData = { off: i / 14, seed: Math.random() * 10, side: (Math.random() - .5) * .6 };
      g.add(sp); steam.push(sp);
    }

    g.position.y = -.65; // pivot near the middle of the cup
    return g;
  }

  /* ---------- coffee beans (instanced) ---------- */
  function beanGeometry() {
    var g = new T.SphereGeometry(1, 40, 28);
    var p = g.attributes.position, v = new T.Vector3();
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (v.y > 0) {
        v.y *= .55;
        var gx = v.x - .07 * Math.sin(v.z * 2.6);
        v.y -= .3 * Math.exp(-(gx * gx) / .006) * (1 - v.z * v.z * .85);
      }
      p.setXYZ(i, v.x * .64, v.y * .5, v.z * .92);
    }
    g.computeVertexNormals();
    return g;
  }

  function buildBeans() {
    var n = isSmall ? 38 : 70;
    var mat = new T.MeshPhysicalMaterial({ color: '#3a1f10', roughness: .4, clearcoat: .7, clearcoatRoughness: .3, envMapIntensity: 1.2 });
    beans = new T.InstancedMesh(beanGeometry(), mat, n);
    for (var i = 0; i < n; i++) {
      var front = Math.random() < .3;
      beanData.push({
        a: (i / n) * Math.PI * 2 + Math.random() * .5,
        r: 1.9 + Math.random() * 1.9,
        y: (Math.random() - .5) * 3.6,
        zb: front ? 1.5 + Math.random() * 1.5 : -Math.random() * 2,
        s: .12 + Math.random() * .1,
        orbit: (.04 + Math.random() * .06) * (Math.random() < .5 ? -1 : 1),
        bob: Math.random() * 6.28,
        rot: new T.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        spin: new T.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(.8)
      });
    }
    beans.instanceMatrix.setUsage(T.DynamicDrawUsage);
    return beans;
  }

  /* ---------- soft contact shadow ---------- */
  function buildShadow() {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'); var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,.65)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    var m = new T.Mesh(new T.PlaneGeometry(4.4, 4.4), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = -.69;
    return m;
  }

  /* ---------- lifecycle ---------- */
  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 1.75));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.physicallyCorrectLights = true;

    scene = new T.Scene();
    scene.environment = makeEnv();
    camera = new T.PerspectiveCamera(32, 1, .1, 100);
    camera.position.set(0, .9, 9);
    camera.lookAt(0, .35, 0);

    scene.add(new T.HemisphereLight('#ffe2c0', '#2a1a10', .55));
    var key = new T.SpotLight('#ffd6a0', 700, 40, .6, .7, 2); key.position.set(-4, 7, 5); scene.add(key);
    var rimL = new T.DirectionalLight('#ffa860', 3.2); rimL.position.set(5, 3, -5); scene.add(rimL);
    var rim2 = new T.DirectionalLight('#ffe6c8', 1.2); rim2.position.set(-6, 2, -4); scene.add(rim2);
    var fill = new T.PointLight('#fff1e0', 25, 30, 2); fill.position.set(3, 1, 6); scene.add(fill);

    rig = new T.Group();
    cupGroup = buildCup();
    rig.add(cupGroup);
    shadow = buildShadow(); rig.add(shadow);
    scene.add(rig);
    scene.add(buildBeans());

    clock = new T.Clock();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    renderer.setAnimationLoop(frame);
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame() {
    var dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    var k = 1 - Math.pow(.001, dt); // frame-rate independent easing
    var asp = camera.aspect, portrait = asp < 1 || window.innerWidth <= 900; // matches the stacked CSS layout
    var xf = portrait ? .12 : Math.min(1, asp / 1.75);
    var gs = portrait ? Math.min(.72, .62 * Math.max(asp, .5) / .46) : 1; // phones get a smaller cup

    mouse.x += (mouse.tx - mouse.x) * k * .6;
    mouse.y += (mouse.ty - mouse.y) * k * .6;

    look.coffee.lerp(target.coffee, k);
    look.foam += (target.foam - look.foam) * k;
    look.steam += (target.steam - look.steam) * k;
    look.ice += (target.ice - look.ice) * k;
    look.size += (target.size - look.size) * k;

    var motion = reduced ? 0 : 1;
    turnAngle += dt * .35 * S.turn * motion;

    var ease = 1 - S.intro;
    rig.position.set(S.x * xf + mouse.x * .08, S.y + (portrait ? 1.05 : 0) + Math.sin(t * .9) * .05 * motion - ease * 1.6, S.z);
    rig.rotation.set(S.rx + mouse.y * .06, S.ry + turnAngle + mouse.x * .12 + Math.sin(t * .4) * .08 * motion, Math.sin(t * .6) * .02 * motion);
    rig.scale.setScalar(S.scale * gs * look.size);
    shadow.material.opacity = Math.max(0, 1 - S.rx * 1.2);

    coffeeMat.uniforms.uTime.value = t;
    coffeeMat.uniforms.uFoam.value = look.foam;
    streamMat.uniforms.uTime.value = t;

    var pour = S.pour * S.intro;
    stream.visible = pour > .01;
    stream.scale.set(Math.max(pour, .01), 9, Math.max(pour, .01));

    var steamVis = look.steam * (1 - Math.min(1, Math.max(0, (S.rx - .4) / .4))) * motion;
    steam.forEach(function (sp) {
      var u = sp.userData, life = (t * .12 + u.off) % 1;
      sp.position.set(u.side + Math.sin(t * .8 + u.seed) * .18 * life, 1.25 + life * 2.4, Math.cos(t * .6 + u.seed) * .15);
      var s = .5 + life * 1.3; sp.scale.set(s, s, s);
      sp.material.opacity = Math.sin(life * Math.PI) * .32 * steamVis;
    });
    ice.forEach(function (m, i) {
      m.scale.setScalar(Math.max(.001, look.ice));
      m.position.y = 1.16 + Math.sin(t * 1.2 + i) * .015;
    });

    // Beans orbit the cup; "spread" pushes them outward to fill the screen.
    var cx = rig.position.x, cy = rig.position.y + .1;
    for (var i = 0; i < beanData.length; i++) {
      var b = beanData[i], a = b.a + t * b.orbit * motion, r = b.r * (.4 + S.spread * .6);
      var ca = Math.cos(a), toText = ca * Math.sign(cx || 1) < 0; // side facing the copy
      var hx = toText && Math.abs(cx) > .3 ? .42 : 1; // keep the copy readable
      dummy.position.set(cx + ca * r * hx * (portrait ? .55 : 1), cy + b.y * (.45 + S.spread * .4) + Math.sin(t * .7 + b.bob) * .12 * motion, b.zb + Math.sin(a) * 1.2 + S.z * .5);
      dummy.rotation.set(b.rot.x + t * b.spin.x * motion, b.rot.y + t * b.spin.y * motion, b.rot.z + t * b.spin.z * motion);
      dummy.scale.setScalar(Math.max(.0001, b.s * S.beanScale * gs * S.intro));
      dummy.updateMatrix();
      beans.setMatrixAt(i, dummy.matrix);
    }
    beans.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
  }

  function setLook(v) {
    if (!v) return;
    if (v.coffee) target.coffee.set(v.coffee);
    if (typeof v.foam === 'number') target.foam = v.foam;
    if (typeof v.steam === 'number') target.steam = v.steam;
    if (typeof v.ice === 'number') target.ice = v.ice;
    if (typeof v.scale === 'number') target.size = v.scale;
  }

  window.SBScene = {
    S: S,
    init: function (canvas) {
      try { if (!T) throw new Error('three.js missing'); init(canvas); return true; }
      catch (e) { console.warn('[SalikBuilds] 3D disabled:', e.message); return false; }
    },
    setLook: setLook,
    step: function (n) { for (var i = 0; i < (n || 1); i++) frame(); }, // test hook: render frames synchronously
    debug: function () { return { look: { foam: look.foam, steam: look.steam, ice: look.ice, size: look.size, coffee: '#' + look.coffee.getHexString() }, S: Object.assign({}, S) }; }
  };
})();
