declare module 'picklejs' {
    interface Pickle {
      loads(buffer: Buffer): any;
      dumps(object: any): Buffer;
    }
  
    const pickle: Pickle;
    export default pickle;
  }
