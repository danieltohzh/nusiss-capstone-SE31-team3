declare module 'pino-pretty' {
    interface PrettyOptions {
      colorize?: boolean;
      crlf?: boolean;
      errorLikeObjectKeys?: string[];
      errorProps?: string;
      levelFirst?: boolean;
      messageKey?: string;
      levelKey?: string;
      timestampKey?: string;
      translateTime?: boolean | string;
      ignore?: string;
      hideObject?: boolean;
      singleLine?: boolean;
    }
  
    function pretty(options?: PrettyOptions): NodeJS.ReadWriteStream;
  
    export = pretty;
  }