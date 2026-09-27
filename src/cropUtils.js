export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

export function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

export default async function getCroppedImg(
  imageSrc,
  pixelCrop,
  rotation = 0
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Calculate bounding box of the rotated image
  const boundingBox = {
    width: image.width,
    height: image.height,
  };

  // set canvas size to match the bounding box
  canvas.width = boundingBox.width;
  canvas.height = boundingBox.height;

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    return null;
  }

  // Set the size of the cropped canvas
  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  // Draw the circular clip
  croppedCtx.beginPath();
  croppedCtx.arc(
    pixelCrop.width / 2,
    pixelCrop.height / 2,
    pixelCrop.width / 2,
    0,
    Math.PI * 2
  );
  croppedCtx.closePath();
  croppedCtx.clip();

  // Draw the cropped image onto the new canvas
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Return as base64 string
  return croppedCanvas.toDataURL('image/png');
}
