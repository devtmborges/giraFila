/**
 * GiraFila — QR Code Camera Scanner Utility
 * Supports Live Video Stream (when available) + Native Device Camera Capture (Universal for Android/iOS over HTTP/LAN)
 * Powered by jsQR and native BarcodeDetector API.
 */

import { parseQrTicketNumber } from './sanitizer.js';
import { showToast, showSuccess } from '../services/errorHandler.js';

let activeStream = null;
let animationFrameId = null;
let scanCanvas = null;
let scanCanvasCtx = null;

function getScanCanvas() {
  if (!scanCanvas) {
    scanCanvas = document.createElement('canvas');
    scanCanvasCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
  }
  return { canvas: scanCanvas, ctx: scanCanvasCtx };
}

/**
 * Checks if live WebRTC stream is supported in the current context
 * (Requires HTTPS or localhost in modern mobile browsers)
 * @returns {boolean}
 */
export function isLiveStreamSupported() {
  return !!(
    window.isSecureContext &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * Decodes QR code from an image Blob or File (from native camera capture)
 * @param {Blob|File} blobOrFile 
 * @returns {Promise<number|null>}
 */
export async function decodeQrFromImage(blobOrFile) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blobOrFile);

    img.onload = async () => {
      URL.revokeObjectURL(url);

      const maxDim = 1200;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const { canvas, ctx } = getScanCanvas();
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // 1. First attempt: jsQR
      if (typeof window.jsQR === 'function') {
        const imgData = ctx.getImageData(0, 0, width, height);
        
        let code = window.jsQR(imgData.data, width, height, { inversionAttempts: 'dontInvert' });
        if (code && code.data) {
          const num = parseQrTicketNumber(code.data);
          if (num) return resolve(num);
        }

        code = window.jsQR(imgData.data, width, height, { inversionAttempts: 'attemptBoth' });
        if (code && code.data) {
          const num = parseQrTicketNumber(code.data);
          if (num) return resolve(num);
        }
      }

      // 2. Second attempt: BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(canvas);
          if (barcodes && barcodes.length > 0) {
            for (const b of barcodes) {
              const num = parseQrTicketNumber(b.rawValue);
              if (num) return resolve(num);
            }
          }
        } catch {
          // ignore detector error
        }
      }

      resolve(null);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Triggers native mobile camera capture (<input type="file" capture="environment">)
 * Universal on Android and iOS even over plain HTTP / LAN IP!
 * @param {function(number): void} onDetectedCallback 
 */
export function openNativeCamera(onDetectedCallback) {
  let fileInput = document.getElementById('girafilaNativeCameraInput');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'girafilaNativeCameraInput';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
  }

  // Handle capture event
  fileInput.onchange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    showToast('GF-CAMERA-SCANNING', 'warning', 'Processando QR Code da imagem...', 2000);

    const ticketNumber = await decodeQrFromImage(file);
    fileInput.value = ''; // Reset input for next scan

    if (ticketNumber) {
      showSuccess(`QR Code #${ticketNumber} identificado com sucesso!`);
      onDetectedCallback(ticketNumber);
    } else {
      showToast(
        'GF-ATTEND-VAL-001',
        'warning',
        'Não foi possível ler o QR Code na foto. Aponte mais de perto com foco ou digite o número.',
        5000
      );
    }
  };

  fileInput.click();
}

/**
 * Starts scanner: attempts live video if supported, or transparently opens native camera.
 * Never blocks the user with an unsupported error!
 * @param {HTMLVideoElement} videoElement 
 * @param {HTMLElement} scannerContainer
 * @param {function(number): void} onDetectedCallback 
 * @returns {Promise<boolean>}
 */
export async function startQrScanner(videoElement, scannerContainer, onDetectedCallback) {
  stopQrScanner();

  // If live stream is NOT supported (e.g. HTTP on mobile Android/iOS), use native camera immediately!
  if (!isLiveStreamSupported()) {
    openNativeCamera(onDetectedCallback);
    return false; // Container does not need to remain open
  }

  try {
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    };

    activeStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = activeStream;
    await videoElement.play();
    scannerContainer.classList.add('active');

    const { canvas, ctx } = getScanCanvas();

    const scanLoop = async () => {
      if (!activeStream || videoElement.paused || videoElement.ended) return;

      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        let detectedTicket = null;

        // Try jsQR first
        if (typeof window.jsQR === 'function') {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(imgData.data, canvas.width, canvas.height, {
            inversionAttempts: 'dontInvert'
          });
          if (code && code.data) {
            detectedTicket = parseQrTicketNumber(code.data);
          }
        }

        // Try BarcodeDetector if jsQR missed
        if (!detectedTicket && 'BarcodeDetector' in window) {
          try {
            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            const codes = await detector.detect(canvas);
            if (codes && codes.length > 0) {
              detectedTicket = parseQrTicketNumber(codes[0].rawValue);
            }
          } catch {}
        }

        if (detectedTicket) {
          stopQrScanner();
          scannerContainer.classList.remove('active');
          onDetectedCallback(detectedTicket);
          return;
        }
      }

      animationFrameId = requestAnimationFrame(scanLoop);
    };

    animationFrameId = requestAnimationFrame(scanLoop);
    return true;
  } catch (err) {
    console.warn('[GiraFila Live Camera Failed, fallback to native camera]', err);
    // On any getUserMedia permission or device failure, fallback smoothly to native camera!
    openNativeCamera(onDetectedCallback);
    return false;
  }
}

/**
 * Stops camera live stream and detection loop
 */
export function stopQrScanner() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (activeStream) {
    try {
      activeStream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.warn('[GiraFila Stop Camera Error]', err);
    }
    activeStream = null;
  }
}
