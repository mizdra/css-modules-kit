import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import type { GenerateDtsResult } from '../dts-generator.js';
import { renderDtsResult } from './dts-mapping.js';

test('renderDtsResult', () => {
  const source = dedent`
    .a_1 {}
    .a_2 .a_3 {}
  `;
  const dts = dedent`
    var _token_0: string;
    export { _token_0 as 'a_1' };
    var _token_1: string;
    export { _token_1 as 'a_2' };
    var _token_2: string;
    export { _token_2 as 'a_3' };
  `;
  const result: GenerateDtsResult = {
    text: dts,
    mapping: {
      sourceOffsets: [source.indexOf('a_1'), source.indexOf('a_2'), source.indexOf('a_3')],
      lengths: [3, 3, 3],
      generatedOffsets: [dts.indexOf('_token_0'), dts.indexOf('_token_1'), dts.indexOf('_token_2')],
      generatedLengths: [8, 8, 8],
    },
    linkedCodeMapping: {
      sourceOffsets: [dts.indexOf('_token_0 as'), dts.indexOf('_token_1 as'), dts.indexOf('_token_2 as')],
      lengths: [8, 8, 8],
      generatedOffsets: [dts.indexOf("'a_1'"), dts.indexOf("'a_2'"), dts.indexOf("'a_3'")],
      generatedLengths: [5, 5, 5],
    },
  };
  expect(renderDtsResult(source, result)).toMatchInlineSnapshot(`
  	"=== source ===
  	.a_1 {}
  	 ^^^ mapping[0]
  	.a_2 .a_3 {}
  	      ^^^ mapping[2]
  	 ^^^ mapping[1]

  	=== generated ===
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
  	var _token_2: string;
  	    ^^^^^^^^ mapping[2]
  	export { _token_2 as 'a_3' };
  	                     ^^^^^ linkedCodeMapping[2]
  	         ^^^^^^^^ linkedCodeMapping[2]"
  `);
});
