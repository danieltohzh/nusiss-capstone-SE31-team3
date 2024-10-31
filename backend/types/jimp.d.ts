declare module 'jimp' {
  // Add static properties to the Jimp class
  namespace Jimp {
    const MIME_PNG: string;
    const MIME_JPEG: string;
    const MIME_BMP: string;
    const MIME_TIFF: string;
    const MIME_GIF: string;
  }

  export default class Jimp {
      static read(data: Buffer | string): Promise<Jimp>;

      constructor(width: number, height: number, color: string | number);

      resize(width: number, height: number): Jimp;
      // Add more methods as needed
      getWidth(): number;
      getHeight(): number;
      getBuffer(mime: string, callback: (err: Error | null, buffer: Buffer) => void): void;
      clone(): Jimp;
      // ... (include other methods you may need)
  }
}


  