// ======================
// ELEMENTOS DA PÁGINA
// ======================
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

// Brilhos
const brilhosCanvas = document.getElementById('brilhosCanvas');
const bCtx = brilhosCanvas.getContext('2d');
const brilhoImg = document.getElementById('brilhoImg');

// ======================
// CONFIGURAÇÃO API
// ======================
const API_URL = 'https://moldurapersonalizadabycriisproducoes-production.up.railway.app/convert';

// ======================
// ESTADO GLOBAL
// ======================
let usingFront = true;
let stream = null;
let mediaRecorder = null;
let chunks = [];
let drawing = false;

// Molduras
const molduras = ['moldura1.png', 'moldura2.png'];
let molduraIndex = 0;

// Brilhos
let brilhos = [];
const MAX_BRILHOS = 15;
let brilhosAtivos = true;

// ======================
// FUNÇÃO: STATUS NO TOPO
// ======================
function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.display = 'inline-block';
  statusEl.style.backgroundColor = isError ? 'rgba(180,0,0,0.7)' : 'rgba(0,0,0,0.6)';
  setTimeout(() => statusEl.style.display = 'none', 4000);
}

// ======================
// CÂMERA
// ======================
async function startCamera() {
  try {
    if (stream) stream.getTracks().forEach(t => t.stop());

    const constraints = {
      video: { facingMode: usingFront ? 'user' : 'environment' },