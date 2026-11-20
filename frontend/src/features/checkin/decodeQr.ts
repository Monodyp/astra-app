import jsQR from 'jsqr';

export function decodeQrFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string | null {
  const { videoWidth: width, videoHeight: height } = video;
  if (video.readyState < video.HAVE_CURRENT_DATA || !width || !height) {
    return null;
  }
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return null;
  }
  context.drawImage(video, 0, 0, width, height);
  const frame = context.getImageData(0, 0, width, height);
  const code = jsQR(frame.data, width, height, {
    inversionAttempts: 'dontInvert',
  });
  return code?.data || null;
}
