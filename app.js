const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const photoCanvas = document.getElementById('photoCanvas');
const recordCanvas = document.getElementById('recordCanvas');
const preview = document.getElementById('preview');

const btnCamera = document.getElementById('btnCamera');
const btnPhoto = document.getElementById('btnPhoto');
const btnStartRec = document.getElementById('btnStartRec');
const btnStopRec = document.getElementById('btnStopRec');

const statusEl = document.getElementById('status');

// TROQUE DEPOIS PELO ENDEREÇO DO RAILWAY
const API_URL = 'https://moldurapersonalizadabycriisproducoes-production.up.railway.app/convert';


let usingFront = true;
let stream;
let mediaRecorder;
let chunks = [];
let drawing = false;

// Inicia / reinicia câmera
async function startCamera() {
  try {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }

    const constraints = {
      video: { facingMode: usingFront ? 'user' : 'environment' },
      audio: true
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.style.transform = usingFront ? 'scaleX(-1)' : 'scaleX(1)';
  } catch (e) {
    console.error(e);
    showStatus('Erro ao acessar câmera/microfone', true);
  }
}

// Mensagem no topo
function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.display = 'inline-block';
  statusEl.style.backgroundColor = isError
    ? 'rgba(180,0,0,0.7)'
    : 'rgba(0,0,0,0.6)';
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 4000);
}

// Trocar câmera
btnCamera.onclick = () => {
  usingFront = !usingFront;
  startCamera();
};

// Tirar foto (9:16)
btnPhoto.onclick = () => {
  if (!stream) return;

  const w = 720;   // largura 9:16
  const h = 1280;  // altura 9:16

  photoCanvas.width = w;
  photoCanvas.height = h;
  const ctx = photoCanvas.getContext('2d');

  // espelha se for câmera frontal
  if (usingFront) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  // desenha vídeo no canvas
  ctx.drawImage(video, 0, 0, w, h);

  // reseta transform
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // desenha moldura
  ctx.drawImage(overlay, 0, 0, w, h);

  const dataUrl = photoCanvas.toDataURL('image/png');

  // preview temporário
  preview.src = dataUrl;
  preview.style.display = 'block';
  setTimeout(() => {
    preview.style.display = 'none';
  }, 3000);
  preview.onclick = () => {
    preview.style.display = 'none';
  };

  // download automático
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'foto-moldura.png';
  a.click();

  showStatus('Foto gerada (veja nos downloads)');
};

// Gravar vídeo (9:16)
btnStartRec.onclick = () => {
  if (!stream) return;

  const targetW = 720;
  const targetH = 1280;

  recordCanvas.width = targetW;
  recordCanvas.height = targetH;
  const rctx = recordCanvas.getContext('2d');

  drawing = true;

  function draw() {
    if (!drawing) return;

    rctx.clearRect(0, 0, targetW, targetH);

    // vídeo
    if (usingFront) {
      rctx.save();
      rctx.translate(targetW, 0);
      rctx.scale(-1, 1);
      rctx.drawImage(video, 0, 0, targetW, targetH);
      rctx.restore();
    } else {
      rctx.drawImage(video, 0, 0, targetW, targetH);
    }

    // moldura
    rctx.drawImage(overlay, 0, 0, targetW, targetH);

    requestAnimationFrame(draw);
  }
  draw();

  const canvasStream = recordCanvas.captureStream(24);
  const mixedStream = new MediaStream();
  canvasStream.getVideoTracks().forEach(t => mixedStream.addTrack(t));

  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length) mixedStream.addTrack(audioTracks[0]);

  chunks = [];
  mediaRecorder = new MediaRecorder(mixedStream);

  mediaRecorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  mediaRecorder.onstop = async () => {
    drawing = false;
    const blob = new Blob(chunks, { type: 'video/webm' });
    if (!blob.size) {
      showStatus('Vídeo vazio, tente novamente', true);
      return;
    }
    await sendToServer(blob);
  };

  mediaRecorder.start(200);

  btnStartRec.style.display = 'none';
  btnStopRec.style.display = 'inline-block';
  showStatus('Gravando...');
};

// Parar gravação
btnStopRec.onclick = () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  btnStartRec.style.display = 'inline-block';
  btnStopRec.style.display = 'none';
  showStatus('Finalizando gravação...');
};

// Enviar para API de conversão
async function sendToServer(blob) {
  showStatus('Enviando vídeo para conversão...');

  try {
    const formData = new FormData();
    formData.append('video', blob, 'video.webm');

    const resp = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    if (!resp.ok) {
      showStatus('Erro ao converter vídeo', true);
      return;
    }

    const mp4Blob = await resp.blob();
    const url = URL.createObjectURL(mp4Blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'video-moldura.mp4';
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showStatus('Vídeo convertido e baixado');
  } catch (e) {
    console.error(e);
    showStatus('Falha ao enviar vídeo', true);
  }
}

// iniciar câmera ao carregar
startCamera();
