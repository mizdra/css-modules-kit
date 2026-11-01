export const CSS_MODULE_EXTENSION = '.module.css';
const COMPONENT_EXTENSIONS = ['.tsx', '.jsx'];

export function isCSSModuleFile(fileName: string): boolean {
  return fileName.endsWith(CSS_MODULE_EXTENSION);
}

export function isComponentFileName(fileName: string): boolean {
  // NOTE: Do not check whether it is an upper camel case or not, since lower camel case (e.g. `page.tsx`) is used in Next.js.
  return COMPONENT_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

export async function findComponentFile(
  cssModuleFileName: string,
  readFile: (path: string) => Promise<string>,
): Promise<{ fileName: string; text: string } | undefined> {
  const pathWithoutExtension = cssModuleFileName.slice(0, -CSS_MODULE_EXTENSION.length);
  for (const path of COMPONENT_EXTENSIONS.map((ext) => pathWithoutExtension + ext)) {
    try {
      // TODO: Cache the result of readFile
      // oxlint-disable-next-line no-await-in-loop
      const text = await readFile(path);
      return { fileName: path, text };
    } catch {
      continue;
    }
  }
  return undefined;
}

export function findComponentFileSync(
  cssModuleFileName: string,
  readFileSync: (path: string) => string,
): { fileName: string; text: string } | undefined {
  const pathWithoutExtension = cssModuleFileName.slice(0, -CSS_MODULE_EXTENSION.length);
  for (const path of COMPONENT_EXTENSIONS.map((ext) => pathWithoutExtension + ext)) {
    try {
      // TODO: Cache the result of readFile
      const text = readFileSync(path);
      return { fileName: path, text };
    } catch {
      continue;
    }
  }
  return undefined;
}
