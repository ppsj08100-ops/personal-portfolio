const GUIDES = [[156,179,true],[343,168,true],[454,202,true],[1298,146,true],[1418,47,true],[1535,101,true],[1597,175,true],[1406,223,true],[1067,109,false],[1268,77,false]]
const REFERENCE_WIDTH=1672, REFERENCE_HEIGHT=941
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
    const skyHeight=Math.ceil(source.height*.30)
    const {data}=pixels.getImageData(0,0,source.width,skyHeight)
    const luminance=(x,y)=>{
      const i=(y*source.width+x)*4
      return data[i]*.25+data[i+1]*.5+data[i+2]*.25
    }
    // Guides belong to the original 1672 × 941 painting, not the viewport.
    const guideScaleX=source.width/REFERENCE_WIDTH,guideScaleY=source.height/REFERENCE_HEIGHT
    const searchX=Math.max(1,Math.round(7*guideScaleX)),searchY=Math.max(1,Math.round(7*guideScaleY))
    const points=GUIDES.map(([gx,gy,major])=>{
      const guideX=Math.round(gx*guideScaleX),guideY=Math.round(gy*guideScaleY)
      let best={x:guideX,y:guideY,value:0,major}
      for(let y=Math.max(0,guideY-searchY);y<=Math.min(skyHeight-1,guideY+searchY);y++)for(let x=Math.max(0,guideX-searchX);x<=Math.min(source.width-1,guideX+searchX);x++){
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
    stars=points.map((point,index)=>({...point,period:3.2+random(index+1)*3.3,phase:random(index+40)*Math.PI*2,size:point.major?1.15:.65+random(index+70)*.2}))
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
      if(x< -35||x>width+35||y< -35||y>height+35)continue
      const wave=(Math.sin(elapsed*Math.PI*2/star.period+star.phase)+1)/2
      // A broad, smooth glint followed by a quieter interval reads at a glance.
      // Independent periods and phases keep the sky from flashing in unison.
      const pulse=wave*wave
      const radius=Math.max(.85,Math.min(scale,1.9))*star.size
      ctx.save();ctx.translate(x,y)
      // Dim the printed highlight gently between glints, with a feathered edge.
      const shade=radius*(star.major?9:6)
      const dim=ctx.createRadialGradient(0,0,0,0,0,shade)
      dim.addColorStop(0,`rgba(1,10,31,${(1-pulse)*.88})`)
      dim.addColorStop(.18,`rgba(1,10,31,${(1-pulse)*.66})`)
      dim.addColorStop(.52,`rgba(1,10,31,${(1-pulse)*.22})`)
      dim.addColorStop(1,'rgba(1,10,31,0)')
      ctx.fillStyle=dim;ctx.fillRect(-shade,-shade,shade*2,shade*2)
      ctx.globalCompositeOperation='screen'
      const halo=radius*(8+pulse*7)
      const glow=ctx.createRadialGradient(0,0,0,0,0,halo)
      glow.addColorStop(0,`rgba(238,249,255,${.08+pulse*.86})`)
      glow.addColorStop(.13,`rgba(177,222,255,${.02+pulse*.56})`)
      glow.addColorStop(.42,`rgba(106,177,248,${pulse*.18})`)
      glow.addColorStop(1,'rgba(73,140,222,0)')
      ctx.fillStyle=glow;ctx.fillRect(-halo,-halo,halo*2,halo*2)
      if(star.major){
        const ray=radius*(4+pulse*11)
        for(const vertical of [false,true]){
          const length=ray*(vertical?1:.78)
          const light=vertical?ctx.createLinearGradient(0,-length,0,length):ctx.createLinearGradient(-length,0,length,0)
          light.addColorStop(0,'rgba(166,218,255,0)')
          light.addColorStop(.38,`rgba(177,224,255,${pulse*.38})`)
          light.addColorStop(.5,`rgba(248,253,255,${.06+pulse*.94})`)
          light.addColorStop(.62,`rgba(177,224,255,${pulse*.38})`)
          light.addColorStop(1,'rgba(166,218,255,0)')
          ctx.strokeStyle=light;ctx.lineWidth=(vertical?.75:.65)+pulse*.35
          ctx.beginPath();ctx.moveTo(vertical?0:-length,vertical?-length:0);ctx.lineTo(vertical?0:length,vertical?length:0);ctx.stroke()
        }
      }
      // A distinct white core makes even the smaller painted stars twinkle.
      ctx.fillStyle=`rgba(244,252,255,${.08+pulse*.92})`
      ctx.beginPath();ctx.arc(0,0,radius*(.3+pulse*.65),0,Math.PI*2);ctx.fill()
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
