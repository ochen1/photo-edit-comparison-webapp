import { useState, useRef, useCallback, useEffect } from "preact/hooks"
import { Button } from "./components/ui/button"
import { GifEditor } from "./components/GifEditor"
import { processImageFile, revokeImageUrl } from "./lib/image-utils"
import { preventImageContextMenu } from "./lib/utils"
import { ImagePlus, RotateCcw, Film, ArrowUpDown } from "lucide-preact"

type AppState = "select" | "compare" | "gif"

export function App() {
  const [state, setState] = useState<AppState>("select")
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [editedImage, setEditedImage] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const [loading, setLoading] = useState(false)

  const bothInputRef = useRef<HTMLInputElement>(null)
  const originalInputRef = useRef<HTMLInputElement>(null)
  const editedInputRef = useRef<HTMLInputElement>(null)

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (originalImage) revokeImageUrl(originalImage)
      if (editedImage) revokeImageUrl(editedImage)
    }
  }, [])

  const handleBothFilesSelect = useCallback(async (files: FileList) => {
    if (files.length < 2) {
      // If only 1 file selected via "both" input, treat as original
      if (files.length === 1) {
        setLoading(true)
        try {
          const url = await processImageFile(files[0])
          if (originalImage) revokeImageUrl(originalImage)
          setOriginalImage(url)
        } catch (error) {
          console.error("Failed to process image:", error)
          alert("Failed to load image. Please try again.")
        } finally {
          setLoading(false)
        }
      }
      return
    }

    setLoading(true)
    try {
      // Process both files - first is original, second is edited
      const [originalUrl, editedUrl] = await Promise.all([
        processImageFile(files[0]),
        processImageFile(files[1]),
      ])

      // Cleanup old URLs if they exist
      if (originalImage) revokeImageUrl(originalImage)
      if (editedImage) revokeImageUrl(editedImage)

      setOriginalImage(originalUrl)
      setEditedImage(editedUrl)
    } catch (error) {
      console.error("Failed to process images:", error)
      alert("Failed to load images. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [originalImage, editedImage])

  const handleSingleFileSelect = useCallback(async (file: File, type: "original" | "edited") => {
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
      alert("Failed to load image. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [originalImage, editedImage])

  const handleBothInputChange = useCallback((e: Event) => {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      handleBothFilesSelect(input.files)
    }
    input.value = "" // Reset for re-selection
  }, [handleBothFilesSelect])

  const handleSingleInputChange = useCallback((e: Event, type: "original" | "edited") => {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      handleSingleFileSelect(input.files[0], type)
    }
    input.value = "" // Reset for re-selection
  }, [handleSingleFileSelect])

  const swapImages = useCallback(() => {
    const temp = originalImage
    setOriginalImage(editedImage)
    setEditedImage(temp)
  }, [originalImage, editedImage])

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

  // GIF Editor Screen
  if (state === "gif") {
    return (
      <GifEditor
        originalImage={originalImage}
        editedImage={editedImage}
        onBack={() => setState("compare")}
      />
    )
  }

  // Selection Screen
  if (state === "select") {
    const hasImages = originalImage && editedImage
    const hasOneImage = (originalImage && !editedImage) || (!originalImage && editedImage)

    return (
      <div class="h-full w-full bg-black flex flex-col items-center justify-center p-6 gap-6">
        <h1 class="text-white text-2xl font-semibold text-center">
          Compare Images
        </h1>
        <p class="text-gray-400 text-center text-sm max-w-xs">
          {hasImages 
            ? "Images loaded. Tap swap if needed, then compare."
            : hasOneImage
            ? "Now select the second image"
            : "Select two images to compare"
          }
        </p>

        {/* Hidden file inputs */}
        <input
          ref={bothInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          class="hidden"
          onChange={handleBothInputChange}
        />
        <input
          ref={originalInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          class="hidden"
          onChange={(e) => handleSingleInputChange(e, "original")}
        />
        <input
          ref={editedInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          class="hidden"
          onChange={(e) => handleSingleInputChange(e, "edited")}
        />

        {!originalImage && !editedImage ? (
          /* Initial state - no images selected */
          <div class="flex flex-col gap-4 w-full max-w-xs">
            {/* Select both at once */}
            <button
              onClick={() => bothInputRef.current?.click()}
              disabled={loading}
              class={`
                flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed
                transition-all w-full min-h-[120px]
                border-gray-600 hover:border-gray-400 bg-white/5
                ${loading ? "opacity-50" : ""}
              `}
            >
              <ImagePlus class="w-8 h-8 text-gray-400" />
              <span class="text-gray-300 text-center">
                {loading ? "Processing..." : "Select 2 Images at Once"}
              </span>
              <span class="text-gray-500 text-xs text-center">
                First = Original, Second = Edited
              </span>
            </button>

            <div class="flex items-center gap-3">
              <div class="flex-1 h-px bg-gray-700" />
              <span class="text-gray-500 text-xs">or one at a time</span>
              <div class="flex-1 h-px bg-gray-700" />
            </div>

            {/* Select individually */}
            <div class="flex gap-3">
              <button
                onClick={() => originalInputRef.current?.click()}
                disabled={loading}
                class="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-600 hover:border-green-500 bg-white/5 transition-colors"
              >
                <ImagePlus class="w-6 h-6 text-gray-400" />
                <span class="text-gray-300 text-sm">Original</span>
              </button>
              <button
                onClick={() => editedInputRef.current?.click()}
                disabled={loading}
                class="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-600 hover:border-blue-500 bg-white/5 transition-colors"
              >
                <ImagePlus class="w-6 h-6 text-gray-400" />
                <span class="text-gray-300 text-sm">Edited</span>
              </button>
            </div>
          </div>
        ) : hasOneImage ? (
          /* One image selected - show it and prompt for the other */
          <div class="flex flex-col gap-4 w-full max-w-xs">
            <div class="flex gap-3">
              {/* Original slot */}
              {originalImage ? (
                <div class="flex-1 flex flex-col items-center gap-2">
                  <div class="relative">
                    <img 
                      src={originalImage} 
                      class="w-20 h-20 rounded-lg object-cover border-2 border-green-500" 
                      alt="Original"
                      onContextMenu={preventImageContextMenu}
                      draggable={false}
                    />
                    <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                      Original
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => originalInputRef.current?.click()}
                  disabled={loading}
                  class="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-green-500/50 hover:border-green-500 bg-green-500/5 transition-colors min-h-[100px]"
                >
                  <ImagePlus class="w-6 h-6 text-green-400" />
                  <span class="text-green-400 text-sm">Select Original</span>
                </button>
              )}

              {/* Edited slot */}
              {editedImage ? (
                <div class="flex-1 flex flex-col items-center gap-2">
                  <div class="relative">
                    <img 
                      src={editedImage} 
                      class="w-20 h-20 rounded-lg object-cover border-2 border-blue-500" 
                      alt="Edited"
                      onContextMenu={preventImageContextMenu}
                      draggable={false}
                    />
                    <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                      Edited
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => editedInputRef.current?.click()}
                  disabled={loading}
                  class="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-blue-500/50 hover:border-blue-500 bg-blue-500/5 transition-colors min-h-[100px]"
                >
                  <ImagePlus class="w-6 h-6 text-blue-400" />
                  <span class="text-blue-400 text-sm">Select Edited</span>
                </button>
              )}
            </div>

            {/* Reset link */}
            <button
              onClick={reset}
              class="text-gray-400 hover:text-white text-sm underline transition-colors"
            >
              Start over
            </button>
          </div>
        ) : (
          /* Both images selected - preview with swap */
          <div class="flex flex-col gap-4 w-full max-w-xs">
            <div class="flex items-center gap-4">
              {/* Original */}
              <button
                onClick={() => originalInputRef.current?.click()}
                class="flex-1 flex flex-col items-center gap-2 group"
              >
                <div class="relative">
                   <img 
                     src={originalImage!} 
                     class="w-24 h-24 rounded-lg object-cover border-2 border-green-500 group-hover:opacity-75 transition-opacity" 
                     alt="Original"
                     onContextMenu={preventImageContextMenu}
                     draggable={false}
                   />
                  <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Original
                  </span>
                </div>
              </button>

              {/* Swap button */}
              <button
                onClick={swapImages}
                class="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                title="Swap images"
              >
                <ArrowUpDown class="w-5 h-5" />
              </button>

              {/* Edited */}
              <button
                onClick={() => editedInputRef.current?.click()}
                class="flex-1 flex flex-col items-center gap-2 group"
              >
                <div class="relative">
                   <img 
                     src={editedImage!} 
                     class="w-24 h-24 rounded-lg object-cover border-2 border-blue-500 group-hover:opacity-75 transition-opacity" 
                     alt="Edited"
                     onContextMenu={preventImageContextMenu}
                     draggable={false}
                   />
                  <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Edited
                  </span>
                </div>
              </button>
            </div>

            <p class="text-gray-500 text-xs text-center">
              Tap an image to replace it
            </p>

            {/* Re-select all button */}
            <button
              onClick={() => bothInputRef.current?.click()}
              disabled={loading}
              class="text-gray-400 hover:text-white text-sm underline transition-colors"
            >
              Choose different images
            </button>
          </div>
        )}

        {loading && (
          <p class="text-gray-400 text-sm">Processing...</p>
        )}

        <Button
          onClick={startComparison}
          disabled={!hasImages || loading}
          size="lg"
          class="w-full max-w-xs mt-2"
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
        class="absolute inset-0 w-full h-full object-contain"
        onContextMenu={preventImageContextMenu}
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
        onContextMenu={preventImageContextMenu}
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
      <div class="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <p class="text-white/60 text-sm text-center">
          Hold to see original
        </p>
      </div>

      {/* Bottom action buttons */}
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            reset()
          }}
          class="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition-colors"
        >
          <RotateCcw class="w-4 h-4" />
          New
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            setState("gif")
          }}
          class="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-full text-white text-sm transition-colors"
        >
          <Film class="w-4 h-4" />
          Create GIF
        </button>
      </div>
    </div>
  )
}
