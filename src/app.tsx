import { useState, useRef, useCallback, useEffect } from "preact/hooks"
import { Button } from "./components/ui/button"
import { processImageFile, revokeImageUrl } from "./lib/image-utils"
import { ImagePlus, RotateCcw } from "lucide-preact"

type AppState = "select" | "compare"

export function App() {
  const [state, setState] = useState<AppState>("select")
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [editedImage, setEditedImage] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const [loading, setLoading] = useState(false)

  const originalInputRef = useRef<HTMLInputElement>(null)
  const editedInputRef = useRef<HTMLInputElement>(null)

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (originalImage) revokeImageUrl(originalImage)
      if (editedImage) revokeImageUrl(editedImage)
    }
  }, [])

  const handleFileSelect = useCallback(async (file: File, type: "original" | "edited") => {
    setLoading(true)
    try {
      const url = await processImageFile(file)
      if (type === "original") {
        if (originalImage) revokeImageUrl(originalImage)
        setOriginalImage(url)
      } else {
        if (editedImage) revokeImageUrl(editedImage)
        setEditedImage(url)
      }
    } catch (error) {
      console.error("Failed to process image:", error)
      alert("Failed to load image. Please try another file.")
    } finally {
      setLoading(false)
    }
  }, [originalImage, editedImage])

  const handleInputChange = useCallback((e: Event, type: "original" | "edited") => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
      handleFileSelect(file, type)
    }
  }, [handleFileSelect])

  const startComparison = useCallback(() => {
    if (originalImage && editedImage) {
      setState("compare")
    }
  }, [originalImage, editedImage])

  const reset = useCallback(() => {
    if (originalImage) revokeImageUrl(originalImage)
    if (editedImage) revokeImageUrl(editedImage)
    setOriginalImage(null)
    setEditedImage(null)
    setState("select")
    setShowOriginal(false)
  }, [originalImage, editedImage])

  // Touch/Mouse handlers for comparison view
  const handlePointerDown = useCallback(() => {
    setShowOriginal(true)
  }, [])

  const handlePointerUp = useCallback(() => {
    setShowOriginal(false)
  }, [])

  // Selection Screen
  if (state === "select") {
    return (
      <div class="h-full w-full bg-black flex flex-col items-center justify-center p-6 gap-8">
        <h1 class="text-white text-2xl font-semibold text-center">
          Compare Images
        </h1>
        <p class="text-gray-400 text-center text-sm max-w-xs">
          Select an original image and an edited version to compare them
        </p>

        <div class="flex flex-col gap-4 w-full max-w-xs">
          {/* Original Image Selector */}
          <input
            ref={originalInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            class="hidden"
            onChange={(e) => handleInputChange(e, "original")}
          />
          <button
            onClick={() => originalInputRef.current?.click()}
            disabled={loading}
            class={`
              flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed
              transition-all min-h-[80px]
              ${originalImage 
                ? "border-green-500 bg-green-500/10" 
                : "border-gray-600 hover:border-gray-400 bg-white/5"
              }
              ${loading ? "opacity-50" : ""}
            `}
          >
            {originalImage ? (
              <div class="flex items-center gap-3">
                <img src={originalImage} class="w-12 h-12 rounded-lg object-cover" alt="Original" />
                <span class="text-green-400 font-medium">Original Selected</span>
              </div>
            ) : (
              <>
                <ImagePlus class="w-6 h-6 text-gray-400" />
                <span class="text-gray-300">Select Original Image</span>
              </>
            )}
          </button>

          {/* Edited Image Selector */}
          <input
            ref={editedInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            class="hidden"
            onChange={(e) => handleInputChange(e, "edited")}
          />
          <button
            onClick={() => editedInputRef.current?.click()}
            disabled={loading}
            class={`
              flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed
              transition-all min-h-[80px]
              ${editedImage 
                ? "border-blue-500 bg-blue-500/10" 
                : "border-gray-600 hover:border-gray-400 bg-white/5"
              }
              ${loading ? "opacity-50" : ""}
            `}
          >
            {editedImage ? (
              <div class="flex items-center gap-3">
                <img src={editedImage} class="w-12 h-12 rounded-lg object-cover" alt="Edited" />
                <span class="text-blue-400 font-medium">Edited Selected</span>
              </div>
            ) : (
              <>
                <ImagePlus class="w-6 h-6 text-gray-400" />
                <span class="text-gray-300">Select Edited Image</span>
              </>
            )}
          </button>
        </div>

        {loading && (
          <p class="text-gray-400 text-sm">Processing image...</p>
        )}

        <Button
          onClick={startComparison}
          disabled={!originalImage || !editedImage || loading}
          size="lg"
          class="w-full max-w-xs mt-4"
        >
          Compare Images
        </Button>
      </div>
    )
  }

  // Comparison Screen
  return (
    <div 
      class="h-full w-full bg-black relative select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Edited Image (shown by default) */}
      <img
        src={editedImage!}
        alt="Edited"
        class={`
          absolute inset-0 w-full h-full object-contain
          transition-opacity duration-150
          ${showOriginal ? "opacity-0" : "opacity-100"}
        `}
        draggable={false}
      />

      {/* Original Image (shown when holding) */}
      <img
        src={originalImage!}
        alt="Original"
        class={`
          absolute inset-0 w-full h-full object-contain
          transition-opacity duration-150
          ${showOriginal ? "opacity-100" : "opacity-0"}
        `}
        draggable={false}
      />

      {/* Label indicator */}
      <div class="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div class={`
          px-4 py-2 rounded-full text-sm font-medium
          ${showOriginal 
            ? "bg-orange-500/90 text-white" 
            : "bg-blue-500/90 text-white"
          }
          transition-colors duration-150
        `}>
          {showOriginal ? "Original" : "Edited"}
        </div>
      </div>

      {/* Instructions */}
      <div class="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <p class="text-white/60 text-sm text-center">
          Hold to see original
        </p>
      </div>

      {/* Reset Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          reset()
        }}
        class="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition-colors"
      >
        <RotateCcw class="w-4 h-4" />
        New Comparison
      </button>
    </div>
  )
}
