const Trefoil = (() => {
  // A swept tube along a (2,3) torus knot, lit and projected into a 2D canvas.
  const TAU = Math.PI * 2;
  const REST = { pitch: -0.32, yaw: 0.33, roll: -0.48 };

  const colors = {
    copper: [[56, 21, 14], [143, 47, 20], [235, 88, 32], [255, 152, 77], [255, 222, 161]],
    iris: [[35, 23, 55], [89, 58, 136], [155, 117, 225], [204, 175, 255], [247, 229, 255]],
    silver: [[27, 34, 31], [66, 84, 78], [140, 163, 154], [202, 217, 207], [248, 250, 237]]
  };

  function palette(stops) {
    return Array.from({ length: 128 }, (_, i) => {
      const t = i / 127 * (stops.length - 1);
      const a = Math.min(stops.length - 2, Math.floor(t));
      const rgb = stops[a].map((c, j) => Math.round(c + (stops[a + 1][j] - c) * (t - a)));
      return 'rgb(' + rgb.join(',') + ')';
    });
  }
  const materials = Object.fromEntries(Object.entries(colors).map(([key, stops]) => [
    key, { rib: palette(stops), core: palette(stops.map((rgb, i) => rgb.map(c => Math.round(c * (.18 + i * .038))))) }
  ]));

  function makeKnot(rings = 192, sides = 32) {
    const count = rings * sides;
    const vertices = new Float32Array(count * 6);
    const screen = new Float32Array(count * 6);
    const faces = [];
    for (let i = 0; i < rings; i++) {
      const t = TAU * i / rings;
      const a = 1.38 + .66 * Math.cos(3 * t);
      const dr = -1.98 * Math.sin(3 * t);
      const c = Math.cos(2 * t), s = Math.sin(2 * t);
      const center = [a * c, a * s, .81 * Math.sin(3 * t)];
      const tx = dr * c - 2 * a * s, ty = dr * s + 2 * a * c, tz = 2.43 * Math.cos(3 * t);
      const L = Math.hypot(tx, ty, tz), flat = Math.hypot(tx, ty);
      const ax = -ty / flat, ay = tx / flat;
      const bx = -tz / L * ay, by = tz / L * ax, bz = (tx * ay - ty * ax) / L;
      const radius = .465 + .027 * Math.cos(3 * t + .65);
      for (let j = 0; j < sides; j++) {
        const theta = TAU * j / sides;
        const u = Math.cos(theta), v = Math.sin(theta);
        const nx = ax * u + bx * v, ny = ay * u + by * v, nz = bz * v;
        const k = (i * sides + j) * 6;
        vertices.set([center[0] + radius * nx, center[1] + radius * ny, center[2] + radius * nz, nx, ny, nz], k);
        const ni = (i + 1) % rings, nj = (j + 1) % sides;
        faces.push({ a: k, b: (i * sides + nj) * 6, c: (ni * sides + nj) * 6, d: (ni * sides + j) * 6, z: 0 });
      }
    }
    return { vertices, screen, faces, visible: [] };
  }

  function drawKnot(ctx, width, height, mesh, pose = REST, material = 'copper') {
    const { vertices, screen, faces, visible } = mesh;
    const cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
    const cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw);
    const cr = Math.cos(pose.roll), sr = Math.sin(pose.roll);
    const m = [cr*cy-sr*sp*sy, -sr*cp, cr*sy+sr*sp*cy,
               sr*cy+cr*sp*sy, cr*cp, sr*sy-cr*sp*cy,
               -cp*sy, sp, cp*cy];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let k = 0; k < vertices.length; k += 6) {
      const x=vertices[k], y=vertices[k+1], z=vertices[k+2];
      const nx=vertices[k+3], ny=vertices[k+4], nz=vertices[k+5];
      const depth=m[6]*x+m[7]*y+m[8]*z;
      const p=8.8/(8.8-depth);
      const X=(m[0]*x+m[1]*y+m[2]*z)*p, Y=-(m[3]*x+m[4]*y+m[5]*z)*p;
      screen[k]=X; screen[k+1]=Y; screen[k+2]=depth;
      screen[k+3]=m[0]*nx+m[1]*ny+m[2]*nz;
      screen[k+4]=m[3]*nx+m[4]*ny+m[5]*nz;
      screen[k+5]=m[6]*nx+m[7]*ny+m[8]*nz;
      minX=Math.min(minX,X);maxX=Math.max(maxX,X);
      minY=Math.min(minY,Y);maxY=Math.max(maxY,Y);
    }
    const scale=Math.min(width*.92/(maxX-minX),height*.95/(maxY-minY));
    const ox=(width-(maxX+minX)*scale)/2, oy=(height-(maxY+minY)*scale)/2;
    for(let k=0;k<screen.length;k+=6){screen[k]=screen[k]*scale+ox;screen[k+1]=screen[k+1]*scale+oy;}
    visible.length=0;
    for(const face of faces){
      const {a,b,c,d}=face;
      const facing=(screen[b]-screen[a])*(screen[c+1]-screen[a+1])-(screen[b+1]-screen[a+1])*(screen[c]-screen[a]);
      if(facing>0) continue;
      face.z=(screen[a+2]+screen[b+2]+screen[c+2]+screen[d+2])*.25;
      visible.push(face);
    }
    visible.sort((a,b)=>a.z-b.z);
    ctx.clearRect(0,0,width,height);
    const paint=materials[material] || materials.copper;
    ctx.lineJoin='round';
    for(const {a,b,c,d,z} of visible){
      const nx=(screen[a+3]+screen[c+3])*.5, ny=(screen[a+4]+screen[c+4])*.5, nz=(screen[a+5]+screen[c+5])*.5;
      const diffuse=Math.max(0,-.49*nx+.68*ny+.55*nz);
      const reflection=Math.max(0,-.27*nx+.4*ny+.875*nz);
      const rim=Math.pow(1-Math.max(0,nz),2);
      const light=Math.min(1,Math.max(0,.18+.52*diffuse+.27*Math.pow(reflection,12)+.14*rim+.038*z));
      const tone=Math.round(light*127);
      const ax=screen[a],ay=screen[a+1],bx=screen[b],by=screen[b+1],cx=screen[c],cy=screen[c+1],dx=screen[d],dy=screen[d+1];
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx,cy);ctx.lineTo(dx,dy);ctx.closePath();
      ctx.fillStyle=paint.core[tone];ctx.fill();
      // Fill the raised part of each copper rib. Its projected width narrows naturally at crossings.
      const f=.37;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);
      ctx.lineTo(bx+(cx-bx)*f,by+(cy-by)*f);ctx.lineTo(ax+(dx-ax)*f,ay+(dy-ay)*f);ctx.closePath();
      ctx.fillStyle=paint.rib[tone];ctx.fill();
    }
  }

  function mountKnot(canvas, shouldMove) {
    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx) return;
    const mesh=makeKnot(matchMedia('(max-width: 600px)').matches?148:192,32);
    const pose={...REST};
    let material='copper', active=true, drag=null, last=0, elapsed=0, yaw=0, pitch=0, frame=0, dirty=true;
    const still=canvas.previousElementSibling;
    function request(){if(!frame)frame=requestAnimationFrame(render);}
    function render(now){
      frame=0;
      if(!active||document.hidden){last=0;return;}
      const running=shouldMove()&&!drag;
      if(running && last && now-last<36 && !dirty){request();return;}
      const step=last?Math.min((now-last)/1000,.09):0;
      if(running)elapsed+=step;
      last=now;
      if(running||dirty){
        const rect=canvas.getBoundingClientRect();
        if(!rect.width||!rect.height)return;
        const dpr=Math.min(devicePixelRatio||1,1.65);
        const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        pose.pitch=REST.pitch+pitch+.11*Math.sin(elapsed*.27);
        pose.yaw=REST.yaw+yaw+.6*Math.sin(elapsed*.17);
        pose.roll=REST.roll+.065*Math.sin(elapsed*.25);
        drawKnot(ctx,w,h,mesh,pose,material);
        still.style.visibility='hidden';
        dirty=false;
      }
      if(running)request();
    }
    const refresh=()=>{dirty=true;last=0;request();};
    new ResizeObserver(refresh).observe(canvas);
    new IntersectionObserver(([entry])=>{active=entry.isIntersecting;if(active)refresh();},{rootMargin:'35px'}).observe(canvas);
    document.addEventListener('visibilitychange',refresh);
    window.addEventListener('portfolio-motion',refresh);
    canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      drag={x:e.clientX,y:e.clientY,yaw,pitch};
      canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');refresh();
    });
    canvas.addEventListener('pointermove',e=>{
      if(!drag)return;
      yaw=drag.yaw+(e.clientX-drag.x)*.012;
      pitch=drag.pitch+(e.clientY-drag.y)*.011;
      refresh();
    });
    function release(){if(!drag)return;drag=null;canvas.classList.remove('dragging');refresh();}
    canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
    canvas.addEventListener('keydown',e=>{
      const turns={ArrowLeft:[-.18,0],ArrowRight:[.18,0],ArrowUp:[0,-.18],ArrowDown:[0,.18]};
      if(e.key==='Home'){elapsed=0;yaw=0;pitch=0;}
      else if(turns[e.key]){yaw+=turns[e.key][0];pitch+=turns[e.key][1];}
      else return;
      e.preventDefault();refresh();
    });
    const swatches=document.querySelectorAll('[data-material]');
    swatches.forEach(button=>button.addEventListener('click',()=>{
      material=button.dataset.material;
      swatches.forEach(s=>s.setAttribute('aria-pressed',String(s===button)));
      refresh();
    }));
    refresh();
  }
  return { mount: mountKnot };
})();
