// ========================================
// CABINE DE FOTOS COMPLETA - CRIS PRODUÇÕES
// ========================================

// Elementos do HTML
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const photoCanvas = document.getElementById('photoCanvas');
const recordCanvas = document.getElementById('recordCanvas');
const preview = document.getElementById('preview');
const statusEl = document.getElementById('status');
const btnCamera = document.getElementById('btnCamera');
const btnPhoto = document.getElementById('btnPhoto');
const btnStartRec = document.getElementById('btnStartRec');
const btnStopRec = document.getElementById('btnStopRec');
const btnMoldura = document.getElementById('btnMoldura');
const btnBrilhos = document.getElementById('btnBrilhos');
const brilhosCanvas = document.getElementById('brilhosCanvas');
const bCtx = brilhosCanvas.getContext('2d');
const brilhoImg = document.getElementById('brilhoImg');

// Configurações
const API_URL = 'https://moldurapersonalizadabycriisproducoes-production.up.railway.app/convert';
const molduras = ['moldura1.png', 'moldura2.png'];
let molduraIndex = 0;

// Estado global
let usingFront = true;
let stream = null;
let mediaRecorder = null;
let chunks = [];
let drawing = false;
let brilhos = [];
let brilhosAtivos = true;
const MAX_BRILHOS = 15;

// ========================================
// UTILITÁRIOS
// ========================================
function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.display = 'inline-block';
  statusEl.style.backgroundColor = isError ? 'rgba(180,0,0,0.7)' : 'rgba(0,0,0,0.6)';
  setTimeout(() => statusEl.style.display = 'none', 4000);
}

// ========================================
// CÂMERA
// ========================================
async function startCamera() {
  try {
    if (stream) stream.getTracks().forEach(track => track.stop());

    const constraints = {
      video: { facingMode: usingFront ? 'user' : 'environment' },
      audio: true
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.style.transform = usingFront ? 'scaleX(-1)' : 'scaleX(1)';
    
    // Inicia brilhos quando câmera carregar
    initBrilhos();
  } catch (error) {
    console.error('Erro câmera:', error);
    showStatus('Erro ao acessar câmera', true);
  }
}

// ========================================
// FOTO (9:16 com moldura e brilhos)
// ========================================
function takePhoto() {
  if (!stream) return;

  const width = 720;
  const height = 1280;
  
  photoCanvas.width = width;
  photoCanvas.height = height;
  const ctx = photoCanvas.getContext('2d');

  // Vídeo (espelhado se frontal)
  ctx.save();
  if (usingFront) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, width, height);
  ctx.restore();

  // Moldura atual
  ctx.drawImage(overlay, 0, 0, width, height);

  // Brilhos na foto
  desenharBrilhosNaFoto(ctx, width, height);

  // Preview e download
  const dataUrl = photoCanvas.toDataURL('image/png');
  preview.src = dataUrl;
  preview.style.display = 'block';
  
  setTimeout(() => preview.style.display = 'none', 3000);
  preview.onclick = () => preview.style.display = 'none';

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'foto-moldura.png';
  link.click();

  showStatus('Foto salva nos Downloads!');
}

// ========================================
// VÍDEO (9:16 com moldura e brilhos)
// ========================================
function startRecording() {
  if (!stream) return;

  const width = 720;
  const height = 1280;
  
  recordCanvas.width = width;
  recordCanvas.height = height;
  const ctx = recordCanvas.getContext('2d');

  drawing = true;

  function drawFrame() {
    if (!drawing) return;

    ctx.clearRect(0, 0, width, height);

    // Vídeo
    ctx.save();
    if (usingFront) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    // Moldura
    ctx.drawImage(overlay, 0, 0, width, height);

    // Brilhos
    desenharBrilhosNaFoto(ctx, width, height);

    requestAnimationFrame(drawFrame);
  }

  drawFrame();

  // Gravação
  const canvasStream = recordCanvas.captureStream(24);
  const mixedStream = new MediaStream([...canvasStream.getVideoTracks()]);
  
  const audioTrack = stream.getAudioTracks()[0];
  if (audioTrack) mixedStream.addTrack(audioTrack);

  chunks = [];
  mediaRecorder = new MediaRecorder(mixedStream, { mimeType: 'video/webm' });

  mediaRecorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data);
  mediaRecorder.onstop = () => {
    drawing = false;
    const blob = new Blob(chunks, { type: 'video/webm' });
    if (blob.size) sendToServer(blob);
    else showStatus('Vídeo vazio', true);
  };

  mediaRecorder.start(200);
  btnStartRec.style.display = 'none';
  btnStopRec.style.display = 'inline-block';
  showStatus('🔴 Gravando...');
}

function stopRecording() {
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.stop();
    btnStartRec.style.display = 'inline-block';
    btnStopRec.style.display = 'none';
    showStatus('Processando vídeo...');
  }
}

// ========================================
// CONVERSÃO API (Railway)
// ========================================
async function sendToServer(blob) {
  showStatus('Enviando para conversão...');
  try {
    const formData = new FormData();
    formData.append('video', blob, 'video.webm');

    const response = await fetch(API_URL, { method: 'POST', body: formData });
    
    if (!response.ok) throw new Error('API falhou');

    const mp4Blob = await response.blob();
    const url = URL.createObjectURL(mp4Blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'video-moldura.mp4';
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showStatus('✅ Vídeo MP4 baixado!');
  } catch (error) {
    console.error(error);
    showStatus('❌ Erro na conversão', true);
  }
}

// ========================================
// BRILHOS ANIMADOS
// ========================================
function criarBrilho() {
  brilhos.push({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 20 + 10,
    opacity: Math.random() * 0.5 + 0.5,
    dx: (Math.random() - 0.5) * 0.3,
    dy: (Math.random() - 0.5) * 0.3,
    dOpacity: (Math.random() - 0.5) * 0.02
  });
  
  if (brilhos.length > MAX_BRILHOS) brilhos.shift();
}

function desenharBrilho(ctx, brilho, width, height) {
  const x = (brilho.x * width) / 100;
  const y = (brilho.y * height) / 100;
  const size = brilho.size;
  
  ctx.save();
  ctx.globalAlpha = brilho.opacity;
  ctx.drawImage(brilhoImg, x - size/2, y - size/2, size, size);
  ctx.restore();
}

function desenharBrilhosNaFoto(ctx, width, height) {
  if (!brilhosAtivos) return;
  brilhos.forEach(brilho => desenharBrilho(ctx, brilho, width, height));
}

function atualizarBrilhos() {
  brilhos.forEach(brilho => {
    brilho.x += brilho.dx;
    brilho.y += brilho.dy;
    brilho.opacity += brilho.dOpacity;

    // Piscar
    if (brilho.opacity <= 0) {
      brilho.opacity = 0;
      brilho.dOpacity = Math.abs(brilho.dOpacity);
    } else if (brilho.opacity >= 1) {
      brilho.opacity = 1;
      brilho.dOpacity = -Math.abs(brilho.dOpacity);
    }

    // Reposicionar se sair da tela
    if (brilho.x < -10 || brilho.x > 110 || brilho.y < -10 || brilho.y > 110) {
      Object.assign(brilho, {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 20 + 10,
        opacity: Math.random() * 0.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        dOpacity: (Math.random() - 0.5) * 0.02
      });
    }
  });
}

let animationId;
function animarBrilhos() {
  bCtx.clearRect(0, 0, brilhosCanvas.width, brilhosCanvas.height);
  
  if (brilhosAtivos) {
    atualizarBrilhos();
    brilhos.forEach(brilho => desenharBrilho(bCtx, brilho, brilhosCanvas.width, brilhosCanvas.height));
  }
  
  animationId = requestAnimationFrame(animarBrilhos);
}

function initBrilhos() {
  if (video.readyState >= 2 && video.videoWidth > 0) {
    brilhosCanvas.width = video.videoWidth;
    brilhosCanvas.height = video.videoHeight;
    brilhos = [];
    
    for (let i = 0; i < MAX_BRILHOS; i++) {
      criarBrilho();
    }
    
    if (animationId) cancelAnimationFrame(animationId);
    animarBrilhos();
  } else {
    video.onloadedmetadata = initBrilhos;
  }
}

// ========================================
// EVENTOS DOS BOTÕES
// ========================================
btnCamera.onclick = () => {
  usingFront = !usingFront;
  startCamera();
};

btnPhoto.onclick = takePhoto;
btnStartRec.onclick = startRecording;
btnStopRec.onclick = stopRecording;

btnMoldura.onclick = () => {
  molduraIndex = (molduraIndex + 1) % molduras.length;
  overlay.src = molduras[molduraIndex];
  showStatus(`Moldura ${molduraIndex + 1}`);
};

btnBrilhos.onclick = () => {
  brilhosAtivos = !brilhosAtivos;
  showStatus(brilhosAtivos ? 'Brilhos ON ✨' : 'Brilhos OFF');
};

// ========================================
// INICIALIZAÇÃO
// ========================================
startCamera();
