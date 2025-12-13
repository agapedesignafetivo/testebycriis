// ===============================
// CABINE DE FOTOS - CRIS PRODUÇÕES
// VERSÃO ORGANIZADA
// ===============================

const CONFIG = {
  FOTO: { width: 720, height: 1280 },
  VIDEO_FPS: 24,
  MAX_BRILHOS: 15,
  API_URL: 'https://moldurapersonalizadabycriisproducoes-production.up.railway.app/convert',
  MOLDURAS: ['moldura1.png', 'moldura2.png']
};

const el = id => document.getElementById(id);

const video = el('video');
const overlay = el('overlay');
const statusEl = el('status');
const recIndicator = el('recIndicator');
const recTimeEl = el('recTime');
const brilhosCanvas = el('brilhosCanvas');
const brilhoImg = el('brilhoImg');

let stream;
let usingFront = true;
let molduraIndex = 0;
let brilhosAtivos = true;
let brilhos = [];

function status(msg, erro=false){
  statusEl.textContent = msg;
  statusEl.style.display = 'block';
  statusEl.style.background = erro ? 'rgba(180,0,0,.7)' : 'rgba(0,0,0,.6)';
  setTimeout(()=>statusEl.style.display='none',3000);
}

async function startCamera(){
  if(stream) stream.getTracks().forEach(t=>t.stop());
  stream = await navigator.mediaDevices.getUserMedia({
    video:{facingMode: usingFront?'user':'environment'},
    audio:true
  });
  video.srcObject = stream;
  video.style.transform = usingFront?'scaleX(-1)':'none';
  initBrilhos();
}

function criarBrilho(){
  brilhos.push({
    x:Math.random()*100,
    y:Math.random()*100,
    size:Math.random()*20+10,
    opacity:Math.random()*.5+.5,
    dx:(Math.random()-.5)*.3,
    dy:(Math.random()-.5)*.3,
    dOpacity:(Math.random()-.5)*.02
  });
  if(brilhos.length>CONFIG.MAX_BRILHOS) brilhos.shift();
}

function desenharBrilhos(){
  const ctx = brilhosCanvas.getContext('2d');
  ctx.clearRect(0,0,brilhosCanvas.width,brilhosCanvas.height);
  if(!brilhosAtivos) return;

  brilhos.forEach(b=>{
    b.x+=b.dx; b.y+=b.dy; b.opacity+=b.dOpacity;
    if(b.opacity<=0||b.opacity>=1) b.dOpacity*=-1;
    const x=b.x*brilhosCanvas.width/100;
    const y=b.y*brilhosCanvas.height/100;
    ctx.globalAlpha=b.opacity;
    ctx.drawImage(brilhoImg,x-b.size/2,y-b.size/2,b.size,b.size);
  });

  requestAnimationFrame(desenharBrilhos);
}

function initBrilhos(){
  brilhosCanvas.width = video.videoWidth;
  brilhosCanvas.height = video.videoHeight;
  brilhos = [];
  for(let i=0;i<CONFIG.MAX_BRILHOS;i++) criarBrilho();
  desenharBrilhos();
}

// BOTÕES
el('btnCamera').onclick=()=>{usingFront=!usingFront;startCamera();};
el('btnMoldura').onclick=()=>{
  molduraIndex=(molduraIndex+1)%CONFIG.MOLDURAS.length;
  overlay.src=CONFIG.MOLDURAS[molduraIndex];
};
el('btnBrilhos').onclick=()=>{brilhosAtivos=!brilhosAtivos;};

startCamera();
