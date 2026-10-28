declare const __dirname: string;

declare module 'fs' {
  type Encoding = 'utf8';

  interface FileSystem {
    readFileSync(path: string, encoding: Encoding): string;
    readdirSync(path: string, options: { withFileTypes: true }): DirectoryEntry[];
  }

  interface DirectoryEntry {
    name: string;
    isDirectory(): boolean;
  }

  const fs: FileSystem;
  export default fs;
}

declare module 'path' {
  interface Path {
    join(...paths: string[]): string;
    resolve(...paths: string[]): string;
    relative(from: string, to: string): string;
    sep: string;
  }

  const path: Path;
  export default path;
}
