var I=Object.defineProperty;var Q=(u,e,t)=>e in u?I(u,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):u[e]=t;var a=(u,e,t)=>Q(u,typeof e!="symbol"?e+"":e,t);import{G as F,S as d,V as c,M as g,I as U,a as y,A as P,P as N,b as C,C as x,B as E,c as M,d as W,e as j,T as G,O as K,f as Y,F as R,U as B,W as S,H as z,N as X,g as L,h as v,i as q,j as $,k as J,l as Z}from"./three-K6PujBfj.js";const ee=`
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`,te=`
uniform float uTime;
uniform float uAmp;
uniform vec2 uMouse;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

${ee}

void main() {
  float t = uTime * 0.35;

  // layered noise displacement along the normal
  float n = snoise(normal * 1.6 + vec3(t, t * 0.7, -t * 0.5));
  n += 0.5 * snoise(normal * 3.4 - vec3(t * 0.6, -t, t * 0.4));

  // mouse adds local turbulence
  float mouseInfluence = length(uMouse) * 0.35;
  float disp = n * (0.16 + uAmp * 0.30 + mouseInfluence * 0.12);

  vec3 displaced = position + normal * disp;
  vNoise = n;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mvPosition.xyz);

  gl_Position = projectionMatrix * mvPosition;
}
`,se=`
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uHueShift;
uniform float uDim;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

void main() {
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.4);

  // blend between the two accent colors using noise + scroll-driven shift
  float mixT = clamp(vNoise * 0.5 + 0.5 + uHueShift * 0.4 - 0.2, 0.0, 1.0);
  vec3 base = mix(uColorA, uColorB, mixT);

  // dark glassy body, glowing rim (bloom picks up the rim)
  vec3 body = base * 0.08;
  vec3 rim  = base * (0.9 + 0.6 * sin(uTime * 0.8 + vNoise * 4.0) * 0.15);
  vec3 color = body + rim * fresnel * 1.8 * uDim;

  // subtle inner energy veins
  color += base * smoothstep(0.55, 0.95, vNoise) * 0.35 * uDim;

  float alpha = clamp(0.18 + fresnel * 0.95, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
`,ie=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,re=`
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  float d = distance(vUv, vec2(0.5));
  float glow = smoothstep(0.5, 0.0, d);
  glow = pow(glow, 2.6);
  gl_FragColor = vec4(uColor, glow * uIntensity);
}
`,oe=`
uniform float uTime;
uniform float uSize;
uniform float uSpread;

attribute float aScale;
attribute float aSpeed;
attribute float aOffset;
attribute vec3 aColor;

varying vec3 vColor;
varying float vTwinkle;

void main() {
  vec3 p = position;

  // slow orbital drift around Y + gentle breathing
  float angle = uTime * 0.03 * aSpeed + aOffset;
  float c = cos(angle), s = sin(angle);
  p.xz = mat2(c, -s, s, c) * p.xz;
  p *= 1.0 + uSpread * 0.35;
  p.y += sin(uTime * 0.2 * aSpeed + aOffset * 6.28) * 0.18;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * aScale * (1.0 / -mvPosition.z) * 320.0;
  gl_Position = projectionMatrix * mvPosition;

  vColor = aColor;
  vTwinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aSpeed) + aOffset * 12.0);
}
`,ae=`
varying vec3 vColor;
varying float vTwinkle;

void main() {
  float d = distance(gl_PointCoord, vec2(0.5));
  float alpha = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(vColor, alpha * vTwinkle * 0.85);
}
`,le=`
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uAberration;
uniform float uVignette;

varying vec2 vUv;

float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = vUv;
  vec2 center = uv - 0.5;
  float dist = length(center);

  // very subtle radial chromatic aberration
  vec2 dir = center * dist * uAberration;
  float r = texture2D(tDiffuse, uv + dir).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - dir).b;
  vec3 color = vec3(r, g, b);

  // soft vignette
  float vig = smoothstep(0.95, 0.25, dist * uVignette);
  color *= mix(0.78, 1.0, vig);

  // faint animated grain
  float grain = (rand(uv * vec2(1920.0, 1080.0) + fract(uTime) * 60.0) - 0.5) * 0.035;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`,ne=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;class he{constructor(e,t){a(this,"group",new F);a(this,"orbMaterial");a(this,"haloMaterial");a(this,"halo");this.orbMaterial=new d({vertexShader:te,fragmentShader:se,transparent:!0,depthWrite:!1,uniforms:{uTime:{value:0},uAmp:{value:0},uMouse:{value:new c},uColorA:{value:e},uColorB:{value:t},uHueShift:{value:0},uDim:{value:1}}});const r=new g(new U(1.35,64),this.orbMaterial);this.group.add(r);const s=new g(new U(1.62,2),new y({color:e.clone().lerp(t,.5),wireframe:!0,transparent:!0,opacity:.05}));this.group.add(s),this.haloMaterial=new d({vertexShader:ie,fragmentShader:re,transparent:!0,depthWrite:!1,blending:P,uniforms:{uColor:{value:e.clone().lerp(t,.35)},uIntensity:{value:.5}}}),this.halo=new g(new N(7.5,7.5),this.haloMaterial),this.halo.position.z=-1.5,this.group.add(this.halo)}update(e,t,r){const s=this.orbMaterial.uniforms;s.uTime.value=e,s.uMouse.value.lerp(t,.05),s.uAmp.value=C.lerp(s.uAmp.value,.25+r*.4,.04),s.uHueShift.value=C.lerp(s.uHueShift.value,r,.05),s.uDim.value=C.lerp(s.uDim.value,1-r*.72,.05),this.group.rotation.y=e*.08+t.x*.25,this.group.rotation.x=t.y*.15+r*.6;const o=(1+Math.sin(e*.6)*.02)*(1-r*.3);this.group.scale.setScalar(o),this.haloMaterial.uniforms.uIntensity.value=(.45+Math.sin(e*.8)*.06)*(1-r*.7),this.halo.lookAt(0,0,10)}}class ue{constructor(e,t,r){a(this,"group",new F);a(this,"material");a(this,"comets",[]);a(this,"cometData",[]);const s=new Float32Array(r*3),i=new Float32Array(r),o=new Float32Array(r),l=new Float32Array(r),n=new Float32Array(r*3),m=new x;for(let h=0;h<r;h++){const p=2.6+Math.pow(Math.random(),.65)*6.4,w=Math.random()*Math.PI*2,_=Math.acos(2*Math.random()-1);s[h*3+0]=p*Math.sin(_)*Math.cos(w),s[h*3+1]=p*Math.sin(_)*Math.sin(w)*.75,s[h*3+2]=p*Math.cos(_),i[h]=.4+Math.random()*1.1,o[h]=.4+Math.random()*1.6,l[h]=Math.random()*Math.PI*2,m.copy(e).lerp(t,Math.random()),Math.random()<.18&&m.setRGB(.85,.88,.95),n[h*3+0]=m.r,n[h*3+1]=m.g,n[h*3+2]=m.b}const f=new E;f.setAttribute("position",new M(s,3)),f.setAttribute("aScale",new M(i,1)),f.setAttribute("aSpeed",new M(o,1)),f.setAttribute("aOffset",new M(l,1)),f.setAttribute("aColor",new M(n,3)),this.material=new d({vertexShader:oe,fragmentShader:ae,transparent:!0,depthWrite:!1,blending:P,uniforms:{uTime:{value:0},uSize:{value:.035},uSpread:{value:0}}}),this.group.add(new W(f,this.material)),this.createComets(e,t)}createComets(e,t){const r=new j(.025,8,8);for(let s=0;s<5;s++){const i=e.clone().lerp(t,s/4),o=new g(r,new y({color:i.multiplyScalar(2.2)}));this.comets.push(o),this.cometData.push({radius:2.2+s*.45,speed:.25+Math.random()*.3,tilt:(Math.random()-.5)*1.2,phase:Math.random()*Math.PI*2}),this.group.add(o)}}update(e,t){this.material.uniforms.uTime.value=e,this.material.uniforms.uSpread.value=C.lerp(this.material.uniforms.uSpread.value,t,.05),this.group.rotation.y=e*.012;for(let r=0;r<this.comets.length;r++){const s=this.cometData[r],i=e*s.speed+s.phase;this.comets[r].position.set(Math.cos(i)*s.radius,Math.sin(i*.9)*s.radius*.35+Math.sin(s.tilt)*.6,Math.sin(i)*s.radius*Math.cos(s.tilt))}}}class ce{constructor(e,t){a(this,"group",new F);a(this,"rings",[]);a(this,"shards",[]);a(this,"shardData",[]);const r=[{radius:2.3,tilt:.45,opacity:.32,color:e},{radius:2.9,tilt:-.32,opacity:.2,color:t},{radius:3.6,tilt:.18,opacity:.1,color:e.clone().lerp(t,.5)}];for(const i of r){const o=new g(new G(i.radius,.006,8,220),new y({color:i.color,transparent:!0,opacity:i.opacity,blending:P,depthWrite:!1}));o.rotation.x=Math.PI/2+i.tilt,this.rings.push(o),this.group.add(o)}const s=new K(.09,0);for(let i=0;i<9;i++){const o=e.clone().lerp(t,Math.random()),l=new g(s,new y({color:o,transparent:!0,opacity:.5,wireframe:Math.random()<.4})),n=.5+Math.random()*1.3;l.scale.setScalar(n),this.shards.push(l),this.shardData.push({radius:2.4+Math.random()*1.8,speed:.08+Math.random()*.14,y:(Math.random()-.5)*2.4,phase:Math.random()*Math.PI*2,rot:(Math.random()-.5)*1.6}),this.group.add(l)}}update(e,t,r){for(let s=0;s<this.rings.length;s++){const i=this.rings[s],o=s%2===0?1:-1;i.rotation.z=e*.05*o,i.rotation.x+=(t.y*6e-4-r*2e-4)*o}for(let s=0;s<this.shards.length;s++){const i=this.shardData[s],o=this.shards[s],l=e*i.speed+i.phase;o.position.set(Math.cos(l)*i.radius,i.y+Math.sin(e*.4+i.phase)*.25,Math.sin(l)*i.radius),o.rotation.x=e*i.rot,o.rotation.y=e*i.rot*.7}this.group.rotation.y=-e*.02+t.x*.12}}const O={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class T{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const fe=new Y(-1,1,1,-1,0,1);class de extends E{constructor(){super(),this.setAttribute("position",new R([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new R([0,2,0,0,2,0],2))}}const me=new de;class k{constructor(e){this._mesh=new g(me,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,fe)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class H extends T{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof d?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=B.clone(e.uniforms),this.material=new d({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new k(this.material)}render(e,t,r){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=r.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class V extends T{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,r){const s=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let o,l;this.inverse?(o=0,l=1):(o=1,l=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),i.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),i.buffers.stencil.setClear(l),i.buffers.stencil.setLocked(!0),e.setRenderTarget(r),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(s.EQUAL,1,4294967295),i.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),i.buffers.stencil.setLocked(!0)}}class pe extends T{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class ve{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const r=e.getSize(new c);this._width=r.width,this._height=r.height,t=new S(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:z}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new H(O),this.copyPass.material.blending=X,this.clock=new L}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let r=!1;for(let s=0,i=this.passes.length;s<i;s++){const o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,r),o.needsSwap){if(r){const l=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(l.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(l.EQUAL,1,4294967295)}this.swapBuffers()}V!==void 0&&(o instanceof V?r=!0:o instanceof pe&&(r=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new c);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const r=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(r,s),this.renderTarget2.setSize(r,s);for(let i=0;i<this.passes.length;i++)this.passes[i].setSize(r,s)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class ge extends T{constructor(e,t,r=null,s=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=r,this.clearColor=s,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new x}render(e,t,r){const s=e.autoClear;e.autoClear=!1;let i,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:r),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=s}}const xe={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new x(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			vec3 luma = vec3( 0.299, 0.587, 0.114 );

			float v = dot( texel.xyz, luma );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class b extends T{constructor(e,t,r,s){super(),this.strength=t!==void 0?t:1,this.radius=r,this.threshold=s,this.resolution=e!==void 0?new c(e.x,e.y):new c(256,256),this.clearColor=new x(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let i=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new S(i,o,{type:z}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){const p=new S(i,o,{type:z});p.texture.name="UnrealBloomPass.h"+h,p.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(p);const w=new S(i,o,{type:z});w.texture.name="UnrealBloomPass.v"+h,w.texture.generateMipmaps=!1,this.renderTargetsVertical.push(w),i=Math.round(i/2),o=Math.round(o/2)}const l=xe;this.highPassUniforms=B.clone(l.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new d({uniforms:this.highPassUniforms,vertexShader:l.vertexShader,fragmentShader:l.fragmentShader}),this.separableBlurMaterials=[];const n=[3,5,7,9,11];i=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(n[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new c(1/i,1/o),i=Math.round(i/2),o=Math.round(o/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const m=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=m,this.bloomTintColors=[new v(1,1,1),new v(1,1,1),new v(1,1,1),new v(1,1,1),new v(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const f=O;this.copyUniforms=B.clone(f.uniforms),this.blendMaterial=new d({uniforms:this.copyUniforms,vertexShader:f.vertexShader,fragmentShader:f.fragmentShader,blending:P,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new x,this.oldClearAlpha=1,this.basic=new y,this.fsQuad=new k(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let r=Math.round(e/2),s=Math.round(t/2);this.renderTargetBright.setSize(r,s);for(let i=0;i<this.nMips;i++)this.renderTargetsHorizontal[i].setSize(r,s),this.renderTargetsVertical[i].setSize(r,s),this.separableBlurMaterials[i].uniforms.invSize.value=new c(1/r,1/s),r=Math.round(r/2),s=Math.round(s/2)}render(e,t,r,s,i){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),i&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=r.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let l=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this.fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=l.texture,this.separableBlurMaterials[n].uniforms.direction.value=b.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[n]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=b.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[n]),e.clear(),this.fsQuad.render(e),l=this.renderTargetsVertical[n];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,i&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(r),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=o}getSeperableBlurMaterial(e){const t=[];for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(e*e))/e);return new d({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new c(.5,.5)},direction:{value:new c(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new d({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}b.BlurDirectionX=new c(1,0);b.BlurDirectionY=new c(0,1);class we{constructor(e,t,r,s){a(this,"composer");a(this,"bloom");a(this,"grade");a(this,"baseBloom");this.composer=new ve(e),this.composer.addPass(new ge(t,r)),this.bloom=new b(new c(window.innerWidth,window.innerHeight),s==="high"?.75:.55,.85,.18),this.baseBloom=this.bloom.strength,this.composer.addPass(this.bloom),this.grade=new H({uniforms:{tDiffuse:{value:null},uTime:{value:0},uAberration:{value:s==="high"?.012:0},uVignette:{value:1.15}},vertexShader:ne,fragmentShader:le}),this.composer.addPass(this.grade)}setBloomScale(e){this.bloom.strength=this.baseBloom*e}setSize(e,t,r){this.composer.setSize(e,t),this.composer.setPixelRatio(r)}render(e){this.grade.uniforms.uTime.value=e,this.composer.render()}}const D=new x("#67e8f9"),A=new x("#a78bfa");class ye{constructor({canvas:e,reducedMotion:t,onFps:r}){a(this,"renderer");a(this,"scene",new q);a(this,"camera");a(this,"clock",new L);a(this,"core");a(this,"particles");a(this,"rings");a(this,"postfx");a(this,"mouse",new c);a(this,"smoothMouse",new c);a(this,"scroll",0);a(this,"sectionOffset",new v);a(this,"targetSectionOffset",new v);a(this,"reducedMotion");a(this,"running",!1);a(this,"isLowPower");a(this,"fpsAccum",0);a(this,"fpsFrames",0);a(this,"fpsTimer",0);a(this,"onFps");this.reducedMotion=t,this.onFps=r,this.isLowPower=window.matchMedia("(max-width: 768px)").matches,this.renderer=new $({canvas:e,antialias:!1,alpha:!1,powerPreference:"high-performance"}),this.renderer.setClearColor("#06060b",1),this.camera=new J(42,1,.1,60),this.camera.position.set(0,0,6.2),this.core=new he(D,A),this.particles=new ue(D,A,this.isLowPower?600:1600),this.rings=new ce(D,A),this.scene.add(this.core.group,this.particles.group,this.rings.group),this.scene.fog=new Z("#06060b",.045),this.postfx=new we(this.renderer,this.scene,this.camera,this.isLowPower?"low":"high"),this.resize(),window.addEventListener("resize",()=>this.resize()),window.addEventListener("pointermove",s=>this.onPointerMove(s),{passive:!0}),document.addEventListener("visibilitychange",()=>{document.hidden?this.stop():this.start()})}setScroll(e){this.scroll=e}setSection(e){const t={hero:[0,0,0],about:[1.4,.25,.4],services:[-1.2,-.2,.6],projects:[-1.5,.35,.9],process:[1.3,.3,1.1],skills:[1.1,-.3,1.3],contact:[0,.15,1.7]},[r,s,i]=t[e]??[0,0,0];this.targetSectionOffset.set(r,s,i)}start(){this.running||(this.running=!0,this.clock.start(),this.renderer.setAnimationLoop(()=>this.tick()))}stop(){this.running=!1,this.renderer.setAnimationLoop(null)}renderOnce(){this.core.update(2.5,this.smoothMouse,0),this.particles.update(2.5,0),this.rings.update(2.5,this.smoothMouse,0),this.postfx.render(2.5)}onPointerMove(e){this.mouse.set(e.clientX/window.innerWidth*2-1,-(e.clientY/window.innerHeight)*2+1),this.reducedMotion&&this.renderOnce()}resize(){const e=window.innerWidth,t=window.innerHeight,r=Math.min(window.devicePixelRatio,this.isLowPower?1.5:2);this.renderer.setSize(e,t,!1),this.renderer.setPixelRatio(r),this.camera.aspect=e/t,this.camera.updateProjectionMatrix(),this.postfx.setSize(e,t,r),this.reducedMotion&&this.renderOnce()}tick(){const e=this.clock.getDelta(),t=this.clock.getElapsedTime();this.smoothMouse.lerp(this.mouse,.06),this.sectionOffset.lerp(this.targetSectionOffset,.035),this.camera.position.x=this.smoothMouse.x*.55+this.sectionOffset.x,this.camera.position.y=this.smoothMouse.y*.35+this.sectionOffset.y-this.scroll*.4,this.camera.position.z=6.2+this.sectionOffset.z+this.scroll*2.4,this.camera.lookAt(0,0,0),this.postfx.setBloomScale(1-this.scroll*.45),this.core.update(t,this.smoothMouse,this.scroll),this.particles.update(t,this.scroll),this.rings.update(t,this.smoothMouse,this.scroll),this.postfx.render(t),this.fpsAccum+=e,this.fpsFrames++,this.fpsTimer+=e,this.fpsTimer>=1&&this.onFps&&(this.onFps(Math.round(this.fpsFrames/this.fpsAccum)),this.fpsAccum=0,this.fpsFrames=0,this.fpsTimer=0)}}export{ye as Experience};
