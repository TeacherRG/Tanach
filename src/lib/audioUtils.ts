/**
 * Converts raw PCM audio data (16-bit, mono, 24000Hz) to a playable WAV Blob URL.
 * Gemini TTS returns raw PCM data without a header.
 */
export function pcmToWav(pcmBase64: string, sampleRate: number = 24000): string {
  const byteCharacters = atob(pcmBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const pcmData = new Uint8Array(byteNumbers);
  const dataSize = pcmData.length;
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // RIFF identifier
  // writeString(view, 0, 'RIFF');
  view.setUint32(0, 0x52494646, false); // "RIFF"
  
  // file length
  view.setUint32(4, 36 + dataSize, true);
  
  // RIFF type
  // writeString(view, 8, 'WAVE');
  view.setUint32(8, 0x57415645, false); // "WAVE"
  
  // format chunk identifier
  // writeString(view, 12, 'fmt ');
  view.setUint32(12, 0x666d7420, false); // "fmt "
  
  // format chunk length
  view.setUint32(16, 16, true);
  
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  
  // channel count (1 is mono)
  view.setUint16(22, 1, true);
  
  // sample rate
  view.setUint32(24, sampleRate, true);
  
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  
  // bits per sample
  view.setUint16(34, 16, true);
  
  // data chunk identifier
  // writeString(view, 36, 'data');
  view.setUint32(36, 0x64617461, false); // "data"
  
  // data chunk length
  view.setUint32(40, dataSize, true);
  
  // write PCM data
  const pcmView = new Uint8Array(buffer, 44);
  pcmView.set(pcmData);
  
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
