export const FLAG_ASPECT = 3 / 2
export const FLAG_WIDTH = 300

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = src
  })
}

export function cropToAspect(dataUrl, aspect = FLAG_ASPECT, targetWidth = FLAG_WIDTH) {
  return loadImage(dataUrl).then((image) => {
    const targetHeight = Math.round(targetWidth / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    const scale = Math.max(targetWidth / image.width, targetHeight / image.height)
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale
    ctx.drawImage(image, (targetWidth - drawWidth) / 2, (targetHeight - drawHeight) / 2, drawWidth, drawHeight)
    return canvas.toDataURL('image/png')
  })
}
