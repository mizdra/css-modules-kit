import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { generateDts, type GenerateDtsOptions } from './dts-generator.js';
import { readAndParseCSSModule } from './test/css-module.js';
import { renderDtsResult } from './test/dts-mapping.js';
import { createIFF } from './test/fixture.js';

const defaultExportOptions: GenerateDtsOptions = {
  namedExports: false,
  prioritizeNamedImports: false,
  forTsPlugin: false,
};

const namedExportOptions: GenerateDtsOptions = {
  namedExports: true,
  prioritizeNamedImports: false,
  forTsPlugin: false,
};

async function run(source: string, options: GenerateDtsOptions): Promise<string> {
  const iff = await createIFF({ 'a.module.css': source });
  const cssModule = readAndParseCSSModule(iff.paths['a.module.css']);
  if (cssModule === undefined) throw new Error('failed to parse CSS module');
  return renderDtsResult(source, generateDts(cssModule, options));
}

describe('generates an empty .d.ts file when the CSS module has no tokens', () => {
  test('default export', async () => {
    expect(await run('', defaultExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===


    	=== generated ===
    	// @ts-nocheck
    	declare const styles = {
    	};
    	export default styles;
    	"
    `);
  });
  test('named export', async () => {
    expect(await run('', namedExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===


    	=== generated ===
    	// @ts-nocheck
    	export {};
    	"
    `);
  });
});

describe('creates an entry for each local token declaration', () => {
  const source = dedent`
    .a_1 { color: red; }
    .a_2 { color: red; }
    .a_2 { color: red; }
  `;
  test('default export', async () => {
    expect(await run(source, defaultExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	.a_1 { color: red; }
    	 ^^^ mapping[0]
    	.a_2 { color: red; }
    	 ^^^ mapping[1]
    	.a_2 { color: red; }
    	 ^^^ mapping[2]

    	=== generated ===
    	// @ts-nocheck
    	declare const styles = {
    	  'a_1': '' as readonly string,
    	   ^^^ mapping[0]
    	  'a_2': '' as readonly string,
    	   ^^^ mapping[1]
    	  'a_2': '' as readonly string,
    	   ^^^ mapping[2]
    	};
    	export default styles;
    	"
    `);
  });
  test('named export', async () => {
    expect(await run(source, namedExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	.a_1 { color: red; }
    	 ^^^ mapping[0]
    	.a_2 { color: red; }
    	 ^^^ mapping[1]
    	.a_2 { color: red; }
    	 ^^^ mapping[2]

    	=== generated ===
    	// @ts-nocheck
    	var _token_0: string;
    	    ^^^^^^^^ mapping[0]
    	export { _token_0 as 'a_1' };
    	                     ^^^^^ linkedCodeMapping[0]
    	         ^^^^^^^^ linkedCodeMapping[0]
    	var _token_1: string;
    	    ^^^^^^^^ mapping[1]
    	var _token_1: string;
    	    ^^^^^^^^ mapping[2]
    	export { _token_1 as 'a_2' };
    	                     ^^^^^ linkedCodeMapping[1]
    	         ^^^^^^^^ linkedCodeMapping[1]
    	"
    `);
  });
});

describe('re-exports tokens from an all token importer', () => {
  const source = dedent`
    @import './b.module.css';
    @import './c.module.css';
    @import './c.module.css';
  `;
  test('default export', async () => {
    expect(await run(source, defaultExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	@import './b.module.css';
    	        ^^^^^^^^^^^^^^^^ mapping[0]
    	@import './c.module.css';
    	        ^^^^^^^^^^^^^^^^ mapping[1]
    	@import './c.module.css';
    	        ^^^^^^^^^^^^^^^^ mapping[2]

    	=== generated ===
    	// @ts-nocheck
    	function blockErrorType<T>(val: T): [0] extends [(1 & T)] ? {} : T;
    	declare const styles = {
    	  ...blockErrorType((await import('./b.module.css')).default),
    	                                  ^^^^^^^^^^^^^^^^ mapping[0]
    	  ...blockErrorType((await import('./c.module.css')).default),
    	                                  ^^^^^^^^^^^^^^^^ mapping[1]
    	  ...blockErrorType((await import('./c.module.css')).default),
    	                                  ^^^^^^^^^^^^^^^^ mapping[2]
    	};
    	export default styles;
    	"
    `);
  });
  test('named export', async () => {
    expect(await run(source, namedExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	@import './b.module.css';
    	        ^^^^^^^^^^^^^^^^ mapping[0]
    	@import './c.module.css';
    	        ^^^^^^^^^^^^^^^^ mapping[1]
    	@import './c.module.css';
    	        ^^^^^^^^^^^^^^^^ mapping[2]

    	=== generated ===
    	// @ts-nocheck
    	export * from './b.module.css';
    	              ^^^^^^^^^^^^^^^^ mapping[0]
    	export * from './c.module.css';
    	              ^^^^^^^^^^^^^^^^ mapping[1]
    	export * from './c.module.css';
    	              ^^^^^^^^^^^^^^^^ mapping[2]
    	"
    `);
  });
});

describe('re-exports tokens from a named token importer', () => {
  const source = dedent`
    @value b_1, b_2 as b_alias from './b.module.css';
    @value c_1 from './c.module.css';
    @value c_1 from './c.module.css';
  `;
  test('default export', async () => {
    expect(await run(source, defaultExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	@value b_1, b_2 as b_alias from './b.module.css';
    	                                ^^^^^^^^^^^^^^^^ mapping[1]
    	                   ^^^^^^^ mapping[2]
    	            ^^^ mapping[3]
    	       ^^^ mapping[0]
    	@value c_1 from './c.module.css';
    	                ^^^^^^^^^^^^^^^^ mapping[5]
    	       ^^^ mapping[4]
    	@value c_1 from './c.module.css';
    	                ^^^^^^^^^^^^^^^^ mapping[7]
    	       ^^^ mapping[6]

    	=== generated ===
    	// @ts-nocheck
    	declare const styles = {
    	  'b_1': (await import('./b.module.css')).default['b_1'],
    	                                                  ^^^^^ linkedCodeMapping[0]
    	                       ^^^^^^^^^^^^^^^^ mapping[1]
    	   ^^^ mapping[0]
    	  ^^^^^ linkedCodeMapping[0]
    	  'b_alias': (await import('./b.module.css')).default['b_2'],
    	                                                       ^^^ mapping[3]
    	                                                      ^^^^^ linkedCodeMapping[1]
    	   ^^^^^^^ mapping[2]
    	  ^^^^^^^^^ linkedCodeMapping[1]
    	  'c_1': (await import('./c.module.css')).default['c_1'],
    	                                                  ^^^^^ linkedCodeMapping[2]
    	                       ^^^^^^^^^^^^^^^^ mapping[5]
    	   ^^^ mapping[4]
    	  ^^^^^ linkedCodeMapping[2]
    	  'c_1': (await import('./c.module.css')).default['c_1'],
    	                                                  ^^^^^ linkedCodeMapping[3]
    	                       ^^^^^^^^^^^^^^^^ mapping[7]
    	   ^^^ mapping[6]
    	  ^^^^^ linkedCodeMapping[3]
    	};
    	export default styles;
    	"
    `);
  });
  test('named export', async () => {
    expect(await run(source, namedExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	@value b_1, b_2 as b_alias from './b.module.css';
    	                                ^^^^^^^^^^^^^^^^ mapping[3]
    	                   ^^^^^^^ mapping[2]
    	            ^^^ mapping[1]
    	       ^^^ mapping[0]
    	@value c_1 from './c.module.css';
    	                ^^^^^^^^^^^^^^^^ mapping[5]
    	       ^^^ mapping[4]
    	@value c_1 from './c.module.css';
    	                ^^^^^^^^^^^^^^^^ mapping[7]
    	       ^^^ mapping[6]

    	=== generated ===
    	// @ts-nocheck
    	export {
    	  'b_1' as 'b_1',
    	            ^^^ mapping[0]
    	           ^^^^^ linkedCodeMapping[0]
    	  ^^^^^ linkedCodeMapping[0]
    	  'b_2' as 'b_alias',
    	            ^^^^^^^ mapping[2]
    	           ^^^^^^^^^ linkedCodeMapping[1]
    	   ^^^ mapping[1]
    	  ^^^^^ linkedCodeMapping[1]
    	} from './b.module.css';
    	       ^^^^^^^^^^^^^^^^ mapping[3]
    	export {
    	  'c_1' as 'c_1',
    	            ^^^ mapping[4]
    	           ^^^^^ linkedCodeMapping[2]
    	  ^^^^^ linkedCodeMapping[2]
    	} from './c.module.css';
    	       ^^^^^^^^^^^^^^^^ mapping[5]
    	export {
    	  'c_1' as 'c_1',
    	            ^^^ mapping[6]
    	           ^^^^^ linkedCodeMapping[3]
    	  ^^^^^ linkedCodeMapping[3]
    	} from './c.module.css';
    	       ^^^^^^^^^^^^^^^^ mapping[7]
    	"
    `);
  });
});

describe('creates a reference for a token reference', () => {
  const source = dedent`
    @keyframes a_1 {}
    .a_2 { animation-name: a_1; }
  `;
  test('default export', async () => {
    expect(await run(source, defaultExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	@keyframes a_1 {}
    	           ^^^ mapping[0]
    	.a_2 { animation-name: a_1; }
    	                       ^^^ mapping[2]
    	 ^^^ mapping[1]

    	=== generated ===
    	// @ts-nocheck
    	declare const styles = {
    	  'a_1': '' as readonly string,
    	   ^^^ mapping[0]
    	  'a_2': '' as readonly string,
    	   ^^^ mapping[1]
    	};
    	styles['a_1'];
    	        ^^^ mapping[2]
    	export default styles;
    	"
    `);
  });
  test('named export', async () => {
    expect(await run(source, namedExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	@keyframes a_1 {}
    	           ^^^ mapping[0]
    	.a_2 { animation-name: a_1; }
    	                       ^^^ mapping[2]
    	 ^^^ mapping[1]

    	=== generated ===
    	// @ts-nocheck
    	var _token_0: string;
    	    ^^^^^^^^ mapping[0]
    	export { _token_0 as 'a_1' };
    	                     ^^^^^ linkedCodeMapping[0]
    	         ^^^^^^^^ linkedCodeMapping[0]
    	var _token_1: string;
    	    ^^^^^^^^ mapping[1]
    	export { _token_1 as 'a_2' };
    	                     ^^^^^ linkedCodeMapping[1]
    	         ^^^^^^^^ linkedCodeMapping[1]
    	declare const __self: typeof import('./a.module.css');
    	__self['a_1'];
    	        ^^^ mapping[2]
    	"
    `);
  });
});

describe('omits importers whose specifier is a URL', () => {
  const source = dedent`
    @import 'https://example.com/b.module.css';
    @value c_1 from 'https://example.com/c.module.css';
  `;
  test('default export', async () => {
    expect(await run(source, defaultExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	@import 'https://example.com/b.module.css';
    	@value c_1 from 'https://example.com/c.module.css';

    	=== generated ===
    	// @ts-nocheck
    	declare const styles = {
    	};
    	export default styles;
    	"
    `);
  });
  test('named export', async () => {
    expect(await run(source, namedExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	@import 'https://example.com/b.module.css';
    	@value c_1 from 'https://example.com/c.module.css';

    	=== generated ===
    	// @ts-nocheck
    	export {};
    	"
    `);
  });
});

describe('omits tokens whose name fails validateTokenName', () => {
  const source = dedent`
    .__proto__ { color: red; }
    @value __proto__ from './b.module.css';
    @value b_1 as __proto__ from './b.module.css';
  `;
  test('default export', async () => {
    expect(await run(source, defaultExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	.__proto__ { color: red; }
    	@value __proto__ from './b.module.css';
    	@value b_1 as __proto__ from './b.module.css';

    	=== generated ===
    	// @ts-nocheck
    	declare const styles = {
    	};
    	export default styles;
    	"
    `);
  });
  test('named export', async () => {
    expect(await run(source, namedExportOptions)).toMatchInlineSnapshot(`
    	"=== source ===
    	.__proto__ { color: red; }
    	@value __proto__ from './b.module.css';
    	                      ^^^^^^^^^^^^^^^^ mapping[0]
    	@value b_1 as __proto__ from './b.module.css';
    	                             ^^^^^^^^^^^^^^^^ mapping[1]

    	=== generated ===
    	// @ts-nocheck
    	export {
    	} from './b.module.css';
    	       ^^^^^^^^^^^^^^^^ mapping[0]
    	export {
    	} from './b.module.css';
    	       ^^^^^^^^^^^^^^^^ mapping[1]
    	"
    `);
  });
});

test('appends a default styles export so completion suggestions show up when forTsPlugin and namedExports are on without prioritizeNamedImports', async () => {
  const source = `.a_1 { color: red; }`;
  expect(await run(source, { namedExports: true, prioritizeNamedImports: false, forTsPlugin: true }))
    .toMatchInlineSnapshot(`
    	"=== source ===
    	.a_1 { color: red; }
    	 ^^^ mapping[0]

    	=== generated ===
    	// @ts-nocheck
    	var _token_0: string;
    	    ^^^^^^^^ mapping[0]
    	export { _token_0 as 'a_1' };
    	                     ^^^^^ linkedCodeMapping[0]
    	         ^^^^^^^^ linkedCodeMapping[0]
    	declare const styles: {};
    	export default styles;
    	"
    `);
});
