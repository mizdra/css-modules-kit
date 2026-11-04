export function buildTSConfigJSON(): string {
  return JSON.stringify({
    contentMappers: [
      {
        package: '@css-modules-kit/content-mapper',
        extensions: ['.css'],
      },
    ],
  });
}
