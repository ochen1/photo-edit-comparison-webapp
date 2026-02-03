import { useState, useRef, useCallback } from "preact/hooks"
import { Button } from "./ui/button"
import { processImageFile, revokeImageUrl } from "../lib/image-utils"
import { generateGif, downloadBlob } from "../lib/gif-utils"
import { ImagePlus, X, GripVertical, Download, Play, ArrowLeft, Loader2 } from "lucide-preact"

interface ImageItem {
  id: string
  url: string
  name: string
}

interface GifEditorProps {
  originalImage: string | null
  editedImage: string | null
  onBack: () => void
}

export function GifEditor({ originalImage, editedImage, onBack }: GifEditorProps) {
  const [images, setImages] = useState<ImageItem[]>(() => {
    const initial: ImageItem[] = []
    if (originalImage) {
      initial.push({ id: "original", url: originalImage, name: "Original" })
    }
    if (editedImage) {
      initial.push({ id: "edited", url: editedImage, name: "Edited" })
    }
    return initial
  })
  
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [frameDelay, setFrameDelay] = useState(500) // ms between frames
  const [maxSize, setMaxSize] = useState<number | null>(null) // null = original size
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nextIdRef = useRef(1)

  const handleAddImages = useCallback(async (files: FileList) => {
    const newImages: ImageItem[] = []
    
    for (const file of Array.from(files)) {
      try {
        const url = await processImageFile(file)
        newImages.push({
          id: `img-${nextIdRef.current++}`,
          url,
          name: file.name.replace(/\.[^/.]+$/, "").slice(0, 20),
        })
      } catch (error) {
        console.error("Failed to process image:", error)
      }
    }
    
    setImages((prev) => [...prev, ...newImages])
  }, [])

  const handleFileChange = useCallback((e: Event) => {
    const input = e.target as HTMLInputElement
    if (input.files?.length) {
      handleAddImages(input.files)
      input.value = "" // Reset input
    }
  }, [handleAddImages])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const item = prev.find((img) => img.id === id)
      // Only revoke if it's not the original or edited image
      if (item && item.id !== "original" && item.id !== "edited") {
        revokeImageUrl(item.url)
      }
      return prev.filter((img) => img.id !== id)
    })
  }, [])

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return
    
    setImages((prev) => {
      const newImages = [...prev]
      const [draggedItem] = newImages.splice(draggedIndex, 1)
      newImages.splice(targetIndex, 0, draggedItem)
      return newImages
    })
    setDraggedIndex(targetIndex)
  }, [draggedIndex])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

  // Touch reordering
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return
    setImages((prev) => {
      const newImages = [...prev]
      ;[newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]]
      return newImages
    })
  }, [])

  const handleMoveDown = useCallback((index: number) => {
    setImages((prev) => {
      if (index === prev.length - 1) return prev
      const newImages = [...prev]
      ;[newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]]
      return newImages
    })
  }, [])

  const handleGenerateGif = useCallback(async () => {
    if (images.length < 2) {
      alert("Need at least 2 images to create a GIF")
      return
    }

    setGenerating(true)
    setProgress(0)
    
    try {
      const blob = await generateGif({
        images: images.map((img) => img.url),
        maxSize: maxSize ?? undefined,
        delay: frameDelay,
        loop: true,
        quality: 10,
        onProgress: setProgress,
      })
      
      // Create preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch (error) {
      console.error("Failed to generate GIF:", error)
      alert("Failed to generate GIF. Please try again.")
    } finally {
      setGenerating(false)
    }
  }, [images, frameDelay, previewUrl])

  const handleDownload = useCallback(() => {
    if (!previewUrl) return
    
    fetch(previewUrl)
      .then((res) => res.blob())
      .then((blob) => {
        downloadBlob(blob, `comparison-${Date.now()}.gif`)
      })
  }, [previewUrl])

  return (
    <div class="h-full w-full bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div class="flex items-center justify-between p-4 border-b border-gray-800">
        <button
          onClick={onBack}
          class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft class="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 class="text-white font-semibold">Create GIF</h1>
        <div class="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Main content */}
      <div class="flex-1 overflow-y-auto p-4">
        {/* Frame sequence */}
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-white text-sm font-medium">Frame Sequence</h2>
            <span class="text-gray-500 text-xs">{images.length} frames</span>
          </div>
          
          <div class="space-y-2">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e as DragEvent, index)}
                onDragEnd={handleDragEnd}
                class={`
                  flex items-center gap-3 p-2 rounded-lg bg-gray-900 border border-gray-800
                  ${draggedIndex === index ? "opacity-50" : ""}
                  touch-manipulation
                `}
              >
                <div class="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    class="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === images.length - 1}
                    class="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>
                
                <GripVertical class="w-4 h-4 text-gray-600 cursor-grab hidden sm:block" />
                
                <img
                  src={image.url}
                  alt={image.name}
                  class="w-12 h-12 rounded object-cover flex-shrink-0"
                />
                
                <div class="flex-1 min-w-0">
                  <span class="text-white text-sm truncate block">{image.name}</span>
                  <span class="text-gray-500 text-xs">Frame {index + 1}</span>
                </div>
                
                <button
                  onClick={() => removeImage(image.id)}
                  class="p-2 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add more images */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            class="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            class="mt-3 w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors"
          >
            <ImagePlus class="w-5 h-5" />
            <span>Add Intermediate Steps</span>
          </button>
        </div>

        {/* Settings */}
        <div class="mb-6">
          <h2 class="text-white text-sm font-medium mb-3">Settings</h2>
          <div class="bg-gray-900 rounded-lg p-4 space-y-4">
            <label class="block">
              <span class="text-gray-400 text-sm">Frame Duration</span>
              <div class="flex items-center gap-3 mt-2">
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={frameDelay}
                  onInput={(e) => setFrameDelay(parseInt((e.target as HTMLInputElement).value))}
                  class="flex-1 accent-blue-500"
                />
                <span class="text-white text-sm w-16 text-right">{frameDelay}ms</span>
              </div>
            </label>
            
            <label class="block">
              <span class="text-gray-400 text-sm">Max Size</span>
              <div class="flex items-center gap-3 mt-2">
                <select
                  value={maxSize ?? "original"}
                  onChange={(e) => {
                    const val = (e.target as HTMLSelectElement).value
                    setMaxSize(val === "original" ? null : parseInt(val))
                  }}
                  class="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700"
                >
                  <option value="original">Original Size</option>
                  <option value="1920">1920px (Full HD)</option>
                  <option value="1280">1280px (HD)</option>
                  <option value="800">800px (Medium)</option>
                  <option value="480">480px (Small)</option>
                </select>
              </div>
              <p class="text-gray-500 text-xs mt-1">
                Smaller sizes generate faster and create smaller files
              </p>
            </label>
          </div>
        </div>

        {/* Preview */}
        {previewUrl && (
          <div class="mb-6">
            <h2 class="text-white text-sm font-medium mb-3">Preview</h2>
            <div class="bg-gray-900 rounded-lg p-4 flex flex-col items-center">
              <img
                src={previewUrl}
                alt="GIF Preview"
                class="max-w-full max-h-64 rounded-lg"
              />
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                class="mt-4"
              >
                <Download class="w-4 h-4" />
                Download GIF
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div class="p-4 border-t border-gray-800">
        <Button
          onClick={handleGenerateGif}
          disabled={images.length < 2 || generating}
          size="lg"
          class="w-full"
        >
          {generating ? (
            <>
              <Loader2 class="w-5 h-5 animate-spin" />
              Generating... {Math.round(progress * 100)}%
            </>
          ) : (
            <>
              <Play class="w-5 h-5" />
              Generate GIF
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
