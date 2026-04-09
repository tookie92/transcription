import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let isLoading = false;
let isLoaded = false;

export interface ConversionResult {
  success: boolean;
  audioBlob?: Blob;
  audioUrl?: string;
  error?: string;
  isVideo: boolean;
  originalSize?: number;
  convertedSize?: number;
}

export interface ConversionProgress {
  progress: number;
  time?: number;
}

export const videoConverter = {
  /**
   * Check if FFmpeg is loaded
   */
  isReady: () => isLoaded,

  /**
   * Get the FFmpeg instance
   */
  getInstance: () => ffmpeg,

  /**
   * Load FFmpeg WASM - must be called before conversion
   */
  load: async (
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<boolean> => {
    if (isLoaded && ffmpeg) {
      return true;
    }

    if (isLoading) {
      // Wait for existing load to complete
      while (isLoading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return isLoaded;
    }

    isLoading = true;

    try {
      ffmpeg = new FFmpeg();

      // Set up progress handler
      ffmpeg.on("progress", ({ progress, time }) => {
        onProgress?.({ progress: progress * 100, time });
      });

      // Load FFmpeg core from CDN
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });

      isLoaded = true;
      isLoading = false;
      return true;
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
      isLoading = false;
      isLoaded = false;
      return false;
    }
  },

  /**
   * Check if a file is a video
   */
  isVideoFile: (file: File): boolean => {
    return file.type.startsWith("video/");
  },

  /**
   * Check if a file extension is a video format
   */
  isVideoExtension: (filename: string): boolean => {
    const videoExtensions = [
      ".mp4",
      ".webm",
      ".mov",
      ".avi",
      ".mkv",
      ".m4v",
      ".wmv",
      ".flv",
    ];
    const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
    return videoExtensions.includes(ext);
  },

  /**
   * Convert video to audio (MP3)
   */
  convertToAudio: async (
    file: File,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<ConversionResult> => {
    const isVideo = videoConverter.isVideoFile(file) || videoConverter.isVideoExtension(file.name);

    // If not a video, return as-is
    if (!isVideo) {
      return {
        success: true,
        isVideo: false,
        audioBlob: file,
        audioUrl: URL.createObjectURL(file),
        originalSize: file.size,
      };
    }

    // Load FFmpeg if not already loaded
    const loaded = await videoConverter.load(onProgress);
    if (!loaded || !ffmpeg) {
      return {
        success: false,
        isVideo: true,
        error: "Failed to load video converter. Please try again.",
      };
    }

    try {
      // Generate unique filename
      const inputName = `input_${Date.now()}.mp4`;
      const outputName = `output_${Date.now()}.mp3`;

      // Write input file to FFmpeg filesystem
      const inputData = await fetchFile(file);
      await ffmpeg.writeFile(inputName, inputData);

      // Run FFmpeg command to extract and compress audio
      // Use lower bitrate to reduce file size - stays under Vercel 10MB limit
      await ffmpeg.exec([
        "-i",
        inputName,
        "-vn", // No video
        "-acodec",
        "libmp3lame", // MP3 codec
        "-b:a", 
        "32k", // Lower bitrate = smaller file (32k instead of default ~128k)
        "-ar",
        "16000", // Lower sample rate (optimal for Whisper, reduces size further)
        "-ac",
        "1", // Mono channel
        "-y", // Overwrite output
        outputName,
      ]);

      // Read the output file
      const outputData = await ffmpeg.readFile(outputName);
      // Create blob from Uint8Array
      const audioBlob = new Blob([new Uint8Array(outputData as Uint8Array)], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Cleanup
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      return {
        success: true,
        isVideo: true,
        audioBlob,
        audioUrl,
        originalSize: file.size,
        convertedSize: audioBlob.size,
      };
    } catch (error) {
      console.error("FFmpeg conversion error:", error);
      return {
        success: false,
        isVideo: true,
        error: error instanceof Error ? error.message : "Conversion failed",
      };
    }
  },

  /**
   * Cleanup URLs created by conversion
   */
  cleanup: (url: string) => {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  },
};
