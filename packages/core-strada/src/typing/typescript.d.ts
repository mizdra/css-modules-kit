export {};

declare module 'typescript' {
  interface FileSystemEntries {
    readonly files: readonly string[];
    readonly directories: readonly string[];
  }

  export function matchFiles(
    path: string,
    extensions: readonly string[] | undefined,
    excludes: readonly string[] | undefined,
    includes: readonly string[] | undefined,
    useCaseSensitiveFileNames: boolean,
    currentDirectory: string,
    depth: number | undefined,
    getFileSystemEntries: (path: string) => FileSystemEntries,
    realpath: (path: string) => string,
  ): string[];
}
