export {};

declare module 'typescript' {
  interface FileSystemEntries {
    readonly files: readonly string[];
    readonly directories: readonly string[];
  }
  // eslint-disable-next-line max-params
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
