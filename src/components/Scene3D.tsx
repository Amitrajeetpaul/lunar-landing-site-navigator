import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Sample } from '../lib/ephemeris';
import { heightAt, type Terrain } from '../lib/terrain';

const SKY = 150; // km: radius of the sky shell (angular sizes are kept true)
const rad = Math.PI / 180;
// az clockwise from north, scene axes: x east, y up, z south
const dirOf = (az: number, el: number) => new THREE.Vector3(Math.sin(az * rad) * Math.cos(el * rad), Math.sin(el * rad), -Math.cos(az * rad) * Math.cos(el * rad));

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.18, 'rgba(255,200,110,.55)'); gr.addColorStop(1, 'rgba(255,170,60,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

interface Ctx {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; orbitCam: THREE.PerspectiveCamera; landerCam: THREE.PerspectiveCamera;
  controls: OrbitControls; light: THREE.DirectionalLight; sun: THREE.Mesh; glow: THREE.Sprite; earth: THREE.Mesh;
  terrain?: THREE.Mesh; marker: THREE.Group; paths: THREE.Group; h0: number; look: { yaw: number; pitch: number };
  mode: 'orbit' | 'lander'; stop: () => void;
}

export function Scene3D({ terrain, mastM, now, samples }: { terrain: Terrain; mastM: number; now: Sample; samples: Sample[] }) {
  const host = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const [mode, setMode] = useState<'orbit' | 'lander'>(() => (new URLSearchParams(location.search).get('view') === 'lander' ? 'lander' : 'orbit'));

  // ---- one-time setup
  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
    const orbitCam = new THREE.PerspectiveCamera(45, 1, 0.05, 600);
    const landerCam = new THREE.PerspectiveCamera(62, 1, 0.0005, 600); landerCam.rotation.order = 'YXZ';
    const controls = new OrbitControls(orbitCam, renderer.domElement);
    controls.enableDamping = true; controls.minDistance = 0.4; controls.maxDistance = 45; controls.maxPolarAngle = Math.PI * 0.49;

    const light = new THREE.DirectionalLight(0xfff1d8, 3);
    light.castShadow = true; light.shadow.mapSize.set(4096, 2048);
    Object.assign(light.shadow.camera, { left: -13, right: 13, top: 8, bottom: -8, near: 1, far: 110 });
    light.shadow.bias = -0.0004; light.shadow.normalBias = 0.004;
    scene.add(light, light.target, new THREE.AmbientLight(0x8a94b3, 0.42));

    const stars = new THREE.BufferGeometry(), sp: number[] = [];
    for (let i = 0; i < 900; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(400); sp.push(v.x, v.y, v.z); }
    stars.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false })));

    const sun = new THREE.Mesh(new THREE.SphereGeometry(SKY * Math.tan(0.2666 * rad), 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff4d6 }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(26);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(SKY * Math.tan(0.95 * rad), 24, 24), new THREE.MeshBasicMaterial({ color: 0x3f86d6 }));
    scene.add(sun, glow, earth);

    const marker = new THREE.Group();
    marker.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1.4, 0)]), new THREE.LineBasicMaterial({ color: 0xf4b73f })));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 12), new THREE.MeshBasicMaterial({ color: 0xf4b73f })); cone.position.y = 0.11;
    marker.add(cone); scene.add(marker);
    const paths = new THREE.Group(); scene.add(paths);

    const c: Ctx = { renderer, scene, orbitCam, landerCam, controls, light, sun, glow, earth, marker, paths, h0: 0, look: { yaw: 0, pitch: 3 }, mode: 'orbit', stop: () => {} };
    ctx.current = c;

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h); orbitCam.aspect = landerCam.aspect = w / h; orbitCam.updateProjectionMatrix(); landerCam.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    // drag to look around in lander view
    let drag: { x: number; y: number } | null = null;
    const cv = renderer.domElement;
    const down = (e: PointerEvent) => { if (c.mode === 'lander') drag = { x: e.clientX, y: e.clientY }; };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      c.look.yaw -= (e.clientX - drag.x) * 0.15; c.look.pitch = Math.min(Math.max(c.look.pitch + (e.clientY - drag.y) * 0.1, -20), 80);
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => { drag = null; };
    cv.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (c.mode === 'orbit') { controls.update(); renderer.render(scene, orbitCam); }
      else {
        landerCam.rotation.y = -c.look.yaw * rad; landerCam.rotation.x = c.look.pitch * rad; renderer.render(scene, landerCam);
      }
    };
    loop();
    c.stop = () => {
      cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      controls.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
    return () => c.stop();
  }, []);

  // ---- terrain mesh
  useEffect(() => {
    const c = ctx.current!;
    if (c.terrain) { c.scene.remove(c.terrain); c.terrain.geometry.dispose(); }
    const { n, widthM, h } = terrain.view, pos = new Float32Array(n * n * 3);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = (j * n + i) * 3;
      pos[k] = (i / (n - 1) - 0.5) * (widthM / 1000); pos[k + 1] = h[j * n + i] / 1000; pos[k + 2] = -(j / (n - 1) - 0.5) * (widthM / 1000);
    }
    const idx: number[] = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, d = a + n, e = d + 1; idx.push(a, b, d, b, e, d);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9c9a96, roughness: 1, metalness: 0 }));
    m.castShadow = m.receiveShadow = true; c.scene.add(m); c.terrain = m;
    c.h0 = heightAt(terrain, 0, 0) / 1000;
    c.marker.position.set(0, c.h0, 0);
    c.orbitCam.position.set(1.5, c.h0 + 4.5, 11.5); c.controls.target.set(0, c.h0, 0); c.controls.update();
  }, [terrain]);

  // ---- camera height
  useEffect(() => { const c = ctx.current!; c.landerCam.position.set(0, c.h0 + mastM / 1000, 0); }, [mastM, terrain]);

  // ---- sun, earth, light
  useEffect(() => {
    const c = ctx.current!, origin = new THREE.Vector3(0, c.h0, 0);
    const sd = dirOf(now.sunAz, now.sunEl), ed = dirOf(now.earthAz, now.earthEl);
    c.sun.position.copy(origin).addScaledVector(sd, SKY); c.glow.position.copy(c.sun.position);
    c.earth.position.copy(origin).addScaledVector(ed, SKY);
    c.light.target.position.copy(origin); c.light.position.copy(origin).addScaledVector(sd, 45);
    c.light.intensity = now.sunEl > -0.3 ? 3 : 0;
    c.sun.visible = c.glow.visible = true; c.earth.visible = true;
    c.light.target.updateMatrixWorld();
  }, [now.sunAz, now.sunEl, now.earthAz, now.earthEl, terrain]);

  // ---- sky paths
  useEffect(() => {
    const c = ctx.current!, g = c.paths; g.clear();
    const origin = new THREE.Vector3(0, c.h0, 0);
    const build = (az: (s: Sample) => number, el: (s: Sample) => number, color: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < samples.length - 1; i++) {
        if (el(samples[i]) < -6 || el(samples[i + 1]) < -6) continue;
        pts.push(origin.clone().addScaledVector(dirOf(az(samples[i]), el(samples[i])), SKY * 0.98), origin.clone().addScaledVector(dirOf(az(samples[i + 1]), el(samples[i + 1])), SKY * 0.98));
      }
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 })));
    };
    build((s) => s.sunAz, (s) => s.sunEl, 0xf4b73f); build((s) => s.earthAz, (s) => s.earthEl, 0x58a6ff);
  }, [samples, terrain]);

  useEffect(() => { ctx.current!.mode = mode; ctx.current!.marker.visible = mode === 'orbit'; }, [mode]);

  const face = (kind: 'sun' | 'earth') => {
    const c = ctx.current!; c.look.yaw = kind === 'sun' ? now.sunAz : now.earthAz; c.look.pitch = Math.max(kind === 'sun' ? now.sunEl : now.earthEl, 0) + 4;
  };

  return (
    <div className="scene">
      <div ref={host} className="scene-host" />
      <div className="scene-bar">
        <div>
          <button className={mode === 'orbit' ? 'on' : ''} onClick={() => setMode('orbit')}>Orbit view</button>
          <button className={mode === 'lander' ? 'on' : ''} onClick={() => setMode('lander')}>From the lander</button>
        </div>
        {mode === 'lander' && <div><button onClick={() => face('sun')}>Face Sun</button><button onClick={() => face('earth')}>Face Earth</button></div>}
      </div>
      <div className={`scene-note ${terrain.kind === 'procedural' ? '' : 'real'}`}>{terrain.kind === 'procedural' ? 'PROTOTYPE terrain, not real data' : terrain.label}</div>
    </div>
  );
}
