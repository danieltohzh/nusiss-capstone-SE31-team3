declare module 'sharp' {
    interface SharpOptions {
      failOnError?: boolean;
      limitInputPixels?: number;
      sequentialRead?: boolean;
      density?: number;
      raw?: {
        width: number;
        height: number;
        channels: number;
      };
    }
  
    interface ResizeOptions {
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      position?: 'center' | 'top' | 'right' | 'bottom' | 'left' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'entropy' | 'attention';
      background?: string | { r: number; g: number; b: number; alpha: number };
    }
  
    interface Sharp {
      resize(options: ResizeOptions): Sharp;
      toBuffer(): Promise<Buffer>;
      // Add other methods as needed
    }
  
    function sharp(input?: string | Buffer, options?: SharpOptions): Sharp;
  
    export = sharp;
  }