// Client-side WAV encoding utilities for FreBob voice capture.
// Records via MediaRecorder, then decodes with Web Audio API and re-encodes
// to a 16-bit mono 16kHz WAV — the format Lovable AI STT accepts reliably
// (works for WhatsApp OGG/Opus, Safari MP4, Chrome WebM, etc.).

const TARGET_SAMPLE_RATE = 16000;

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  let o = 0;
  let i = 0;
  while (o < outLen) {
    const nextI = Math.floor((o + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = i; j < nextI && j < input.length; j++) { sum += input[j]; count++; }
    out[o] = count > 0 ? sum / count : 0;
    o++;
    i = nextI;
  }
  return out;
}

export async function blobToWavBase64(input: Blob): Promise<{ base64: string; size: number }> {
  const arr = await input.arrayBuffer();
  const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const decoded = await ctx.decodeAudioData(arr.slice(0));
  // Mono mix
  const channels = decoded.numberOfChannels;
  const mono = new Float32Array(decoded.length);
  for (let c = 0; c < channels; c++) {
    const ch = decoded.getChannelData(c);
    for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / channels;
  }
  const down = downsample(mono, decoded.sampleRate, TARGET_SAMPLE_RATE);
  const wav = encodeWav(down, TARGET_SAMPLE_RATE);
  await ctx.close();
  const b64 = await blobToBase64(wav);
  return { base64: b64, size: wav.size };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result);
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export type MicRecorder = {
  stop: () => Promise<Blob>;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  state: () => "recording" | "paused" | "inactive";
  stream: MediaStream;
  mimeType: string;
};

export async function startMicRecorder(): Promise<MicRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
  let mimeType = "";
  for (const t of preferred) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) { mimeType = t; break; }
  }
  const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  rec.start();

  const cleanup = () => stream.getTracks().forEach((t) => t.stop());

  return {
    stream,
    mimeType: rec.mimeType || mimeType || "audio/webm",
    state: () => rec.state,
    pause: () => { if (rec.state === "recording") rec.pause(); },
    resume: () => { if (rec.state === "paused") rec.resume(); },
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          cleanup();
          resolve(new Blob(chunks, { type: rec.mimeType || mimeType || "audio/webm" }));
        };
        try { rec.stop(); } catch { cleanup(); resolve(new Blob(chunks, { type: rec.mimeType || mimeType || "audio/webm" })); }
      }),
    cancel: () => {
      try { rec.stop(); } catch { /* noop */ }
      cleanup();
    },
  };
}
