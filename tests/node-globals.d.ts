declare const __dirname: string;

declare module 'fs' {
  type Encoding = 'utf8';

  interface FileSystem {
    readFileSync(path: string, encoding: Encoding): string;
  }

  const fs: FileSystem;
  export default fs;
}

declare module 'path' {
  interface Path {
    join(...paths: string[]): string;
    resolve(...paths: string[]): string;
  }

  const path: Path;
  export default path;
}
