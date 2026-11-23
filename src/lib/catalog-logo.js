export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MAX_PIXELS = 16000000;
export const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function logoFileIssue(file) {
  if (!LOGO_TYPES.includes(file?.type)) return 'Usa una imagen JPG, PNG o WebP.';
  if (!file.size || file.size > LOGO_MAX_BYTES) return 'El logotipo debe pesar hasta 2 MB.';
  return '';
}

export function logoMime(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return 'image/png';
  if ([82,73,70,70].every((v,i) => bytes[i] === v) && [87,69,66,80].every((v,i) => bytes[i+8] === v)) return 'image/webp';
  return null;
}

export function safeLogoUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) return url.href;
  } catch { /* Invalid legacy image: show initials instead. */ }
  return null;
}
