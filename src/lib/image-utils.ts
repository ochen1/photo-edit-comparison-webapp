import heic2any from "heic2any"

export async function processImageFile(file: File): Promise<string> {
  // Check if it's a HEIC/HEIF file
  const isHeic = file.type === "image/heic" || 
                 file.type === "image/heif" || 
                 file.name.toLowerCase().endsWith(".heic") ||
                 file.name.toLowerCase().endsWith(".heif")

  if (isHeic) {
    try {
      const blob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.92,
      })
      
      const resultBlob = Array.isArray(blob) ? blob[0] : blob
      return URL.createObjectURL(resultBlob)
    } catch (error) {
      console.error("Failed to convert HEIC:", error)
      throw new Error("Failed to convert HEIC image")
    }
  }

  // For other formats, create object URL directly
  return URL.createObjectURL(file)
}

export function revokeImageUrl(url: string) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url)
  }
}
