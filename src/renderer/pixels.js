/** Canvas sink for sprite drawing: every sprite pixel becomes a crisp `scale`×`scale` block. */
export const createPixelCanvas = (canvas, width, height, scale) => {
  const dpr = window.devicePixelRatio || 1;
  const k = scale * dpr;
  canvas.width = Math.round(width * k);
  canvas.height = Math.round(height * k);
  canvas.style.width = `${width * scale}px`;
  canvas.style.height = `${height * scale}px`;
  const ctx = canvas.getContext('2d');
  const edge = (v) => Math.round(v * k);
  return {
    clear: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
    put: (x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(edge(x), edge(y), edge(x + 1) - edge(x), edge(y + 1) - edge(y));
    },
  };
};

/** Pose fingerprint at sprite resolution, to skip redrawing identical frames. */
export const poseKey = (pose) =>
  [
    Math.round((pose.lookX ?? 0) * 2),
    Math.round((pose.lookY ?? 0) * 2),
    pose.cross ?? 0,
    pose.lids,
    pose.mouth,
    pose.brows,
  ].join();
