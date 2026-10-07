/**
 * Compress an image file using browser Canvas API.
 * Validates file size <= 2MB, limits max dimension to 1024px,
 * and encodes to WebP (fallback to JPEG) with quality 0.85.
 */
export async function compressImage(file, maxDimension = 1024, quality = 0.85) {
  if (!file) {
    throw new Error('No file provided')
  }

  // 2MB size check: 2 * 1024 * 1024 bytes
  const MAX_FILE_SIZE = 2 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image size exceeds 2 MB limit')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Selected file must be an image')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.onload = () => {
        let { width, height } = img

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return reject(new Error('Canvas context not available'))
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // Try webp first, fallback to jpeg
        const exportType = 'image/webp'
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // fallback to jpeg
              canvas.toBlob(
                (jpegBlob) => {
                  if (!jpegBlob) return reject(new Error('Failed to compress image'))
                  const previewUrl = URL.createObjectURL(jpegBlob)
                  resolve({
                    blob: jpegBlob,
                    previewUrl,
                    mimeType: 'image/jpeg',
                    name: (file.name || 'avatar').replace(/\.[^.]+$/, '') + '.jpg'
                  })
                },
                'image/jpeg',
                quality
              )
              return
            }

            const previewUrl = URL.createObjectURL(blob)
            resolve({
              blob,
              previewUrl,
              mimeType: 'image/webp',
              name: (file.name || 'avatar').replace(/\.[^.]+$/, '') + '.webp'
            })
          },
          exportType,
          quality
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}
