const GUIDES = [[156,179,true],[343,168,true],[454,202,true],[1298,146,true],[1418,47,true],[1535,101,true],[1597,175,true],[1406,223,true],[1067,109,false],[1268,77,false]]
const random = seed => { const value=Math.sin(seed*127.1+311.7)*43758.5453; return value-Math.floor(value) }

/** Twinkle the stars already painted into the sky, in image coordinates. */
export function initHeroStars(hero) {
  const frame=hero?.querySelector('.hero__frame')
  const artwork=hero?.querySelector('.hero__artwork')
  if(!frame||!artwork)return()=>{}
  const canvas=document.createElement('canvas')
  canvas.className='hero__star-light'
  canvas.setAttribute('aria-hidden','true')
  canvas.hidden=true
  const ctx=canvas.getContext('2d')
  if(!ctx)return()=>{}
  frame.append(canvas)
  const events=new AbortController(), reduced=matchMedia('(prefers-reduced-motion: reduce)')
  const menu=document.querySelector('#portfolio-menu')
  let stars=[], width=0, height=0, scale=1, offsetX=0, offsetY=0
  let visible=false, loaded=false, disposed=false, raf=0, previous=0, drawnAt=0, elapsed=0

  function findStars() {
    if(!artwork.naturalWidth)return
    const source=document.createElement('canvas')
    source.width=artwork.naturalWidth;source.height=artwork.naturalHeight
    const pixels=source.getContext('2d',{willReadFrequently:true})
    if(!pixels)return
    pixels.drawImage(artwork,0,0)
    const {data}=pixels.getImageData(0,0,source.width,Math.ceil(source.height*.30))
    const luminance=(x,y)=>{
      const i=(y*source.width+x)*4
      return data[i]*.25+data[i+1]*.5+data[i+2]*.25
    }
    const points=GUIDES.map(([gx,gy,major])=>{
      let best={x:gx,y:gy,value:0,major}
      for(let y=gy-7;y<=gy+7;y++)for(let x=gx-7;x<=gx+7;x++){
        const value=luminance(x,y)
        if(value>best.value)best={x,y,value,major}
      }
      return best
    })
    const candidates=[]
    for(let y=18;y<source.height*.285;y+=2)for(let x=20;x<source.width-20;x+=2){
      const value=luminance(x,y)
      if(value>140)candidates.push({x,y,value,major:false})
    }
    candidates.sort((a,b)=>b.value-a.value)
    for(const point of candidates){
      if(points.length>=27)break
      if(points.every(p=>Math.hypot(p.x-point.x,p.y-point.y)>24))points.push(point)
    }
    stars=points.map((point,index)=>({...point,period:4.9+random(index+1)*5.5,phase:random(index+40)*Math.PI*2,size:point.major?1:.65+random(index+70)*.2}))
    canvas.dataset.starCount=String(stars.length)
    loaded=true;resize();sync()
  }

  function resize() {
    width=frame.clientWidth;height=frame.clientHeight
    const dpr=Math.min(devicePixelRatio||1,1.5)
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr)
    ctx.setTransform(dpr,0,0,dpr,0,0)
    scale=Math.max(width/(artwork.naturalWidth||1672),height/(artwork.naturalHeight||941))
    const position=getComputedStyle(artwork).objectPosition.split(' ').map(parseFloat)
    offsetX=(width-artwork.naturalWidth*scale)*(Number.isFinite(position[0])?position[0]/100:.5)
    offsetY=(height-artwork.naturalHeight*scale)*(Number.isFinite(position[1])?position[1]/100:.5)
    if(loaded&&canAnimate())draw()
  }

  function draw() {
    ctx.clearRect(0,0,width,height)
    for(const star of stars){
      const x=offsetX+star.x*scale,y=offsetY+star.y*scale
      if(x< -15||x>width+15||y<0||y>height)continue
      const wave=(Math.sin(elapsed*Math.PI*2/star.period+star.phase)+1)/2
      const pulse=wave*wave*(3-2*wave)
      const radius=Math.max(.75,Math.min(scale,1.7))*star.size
      ctx.save();ctx.translate(x,y)
      // Dim the printed highlight gently between glints, with a feathered edge.
      const dim=ctx.createRadialGradient(0,0,0,0,0,radius*6)
      dim.addColorStop(0,`rgba(1,10,31,${(1-pulse)*.76})`)
      dim.addColorStop(.18,`rgba(1,10,31,${(1-pulse)*.48})`)
      dim.addColorStop(.52,`rgba(1,10,31,${(1-pulse)*.14})`)
      dim.addColorStop(1,'rgba(1,10,31,0)')
      ctx.fillStyle=dim;ctx.fillRect(-radius*6,-radius*6,radius*12,radius*12)
      ctx.globalCompositeOperation='screen'
      const halo=radius*(7+pulse*4)
      const glow=ctx.createRadialGradient(0,0,0,0,0,halo)
      glow.addColorStop(0,`rgba(229,245,255,${.04+pulse*.65})`)
      glow.addColorStop(.16,`rgba(145,207,250,${pulse*.33})`)
      glow.addColorStop(1,'rgba(73,140,222,0)')
      ctx.fillStyle=glow;ctx.fillRect(-halo,-halo,halo*2,halo*2)
      if(star.major){
        const ray=radius*(3.2+pulse*7.5)
        for(const vertical of [false,true]){
          const light=vertical?ctx.createLinearGradient(0,-ray,0,ray):ctx.createLinearGradient(-ray,0,ray,0)
          light.addColorStop(0,'rgba(166,218,255,0)')
          light.addColorStop(.5,`rgba(232,248,255,${pulse*.86})`)
          light.addColorStop(1,'rgba(166,218,255,0)')
          ctx.strokeStyle=light;ctx.lineWidth=vertical?.65:.5
          ctx.beginPath();ctx.moveTo(vertical?0:-ray,vertical?-ray:0);ctx.lineTo(vertical?0:ray,vertical?ray:0);ctx.stroke()
        }
      }
      ctx.restore()
    }
  }
  function canAnimate(){return !disposed&&loaded&&visible&&!document.hidden&&!reduced.matches&&!menu?.open}
  function tick(now){
    raf=0
    if(!canAnimate())return sync()
    if(previous)elapsed+=Math.min((now-previous)/1000,.06)
    previous=now
    if(now-drawnAt>=32){draw();drawnAt=now}
    raf=requestAnimationFrame(tick)
  }
  function sync(){
    const active=canAnimate();canvas.hidden=!active
    canvas.dataset.motionState=active?'running':'paused'
    if(active&&!raf){previous=0;draw();raf=requestAnimationFrame(tick)}
    if(!active){cancelAnimationFrame(raf);raf=0;previous=0}
  }
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting&&entry.intersectionRatio>.02;sync()},{threshold:[0,.02]})
  intersection.observe(hero)
  const dimensions=new ResizeObserver(resize);dimensions.observe(frame)
  const dialogObserver=new MutationObserver(sync)
  if(menu)dialogObserver.observe(menu,{attributes:true,attributeFilter:['open']})
  reduced.addEventListener('change',sync,{signal:events.signal})
  document.addEventListener('visibilitychange',sync,{signal:events.signal})
  if(artwork.complete&&artwork.naturalWidth)findStars()
  else artwork.addEventListener('load',findStars,{once:true,signal:events.signal})
  return()=>{disposed=true;events.abort();cancelAnimationFrame(raf);intersection.disconnect();dimensions.disconnect();dialogObserver.disconnect();canvas.remove()}
}
