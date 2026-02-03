import GIF from "gif.js"
// Import the worker script as a URL - Vite will handle this correctly
import gifWorkerUrl from "gif.js/dist/gif.worker.js?url"

export interface GifGenerationOptions {
  images: string[] // Array of image URLs
  maxSize?: number // Optional max dimension (width or height) - if not provided, uses original size
  delay: number // Delay between frames in ms
  loop: boolean // Whether to loop the GIF
  quality: number // 1-20, lower is better quality but slower
  onProgress?: (progress: number) => void
}

/**
 * Load an image from URL and draw it to canvas at specified dimensions
 */
async function loadImageToCanvas(
  url: string,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      
      // Calculate aspect-fit dimensions
      const imgAspect = img.width / img.height
      const canvasAspect = width / height
      
      let drawWidth: number
      let drawHeight: number
      let offsetX: number
      let offsetY: number
      
      if (imgAspect > canvasAspect) {
        // Image is wider - fit to width
        drawWidth = width
        drawHeight = width / imgAspect
        offsetX = 0
        offsetY = (height - drawHeight) / 2
      } else {
        // Image is taller - fit to height
        drawHeight = height
        drawWidth = height * imgAspect
        offsetX = (width - drawWidth) / 2
        offsetY = 0
      }
      
      // Fill with black background
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, width, height)
      
      // Draw image centered
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
      
      resolve(canvas)
    }
    
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

/**
 * Get image dimensions from URL
 */
async function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

/**
 * Generate an animated GIF from a sequence of images
 */
export async function generateGif(options: GifGenerationOptions): Promise<Blob> {
  const { images, maxSize, delay, loop, quality, onProgress } = options
  
  if (images.length === 0) {
    throw new Error("No images provided")
  }
  
  // Get dimensions from the first image
  const firstImageDims = await getImageDimensions(images[0])
  let width = firstImageDims.width
  let height = firstImageDims.height
  
  // Scale down if maxSize is specified and image exceeds it
  if (maxSize && (width > maxSize || height > maxSize)) {
    const scale = maxSize / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  
  // Load all images as canvases
  const canvases = await Promise.all(
    images.map((url) => loadImageToCanvas(url, width, height))
  )
  
  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality,
      width,
      height,
      workerScript: gifWorkerUrl,
      repeat: loop ? 0 : -1, // 0 = loop forever, -1 = no loop
    })
    
    // Add each frame
    for (const canvas of canvases) {
      gif.addFrame(canvas, { delay, copy: true })
    }
    
    gif.on("progress", (p: number) => {
      onProgress?.(p)
    })
    
    gif.on("finished", (blob: Blob) => {
      resolve(blob)
    })
    
    // Handle abort as error case
    gif.on("abort", () => {
      reject(new Error("GIF generation was aborted"))
    })
    
    gif.render()
  })
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
