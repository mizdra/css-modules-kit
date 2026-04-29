# TS Plugin Internals

このドキュメントは、CSS Modules Kit の ts-plugin の内部アーキテクチャについて説明しています。

## 概要

ts-plugin は TypeScript Language Service Plugin です。Volar.js を使って CSS を TypeScript ファイルのように扱うことで、CSS と TypeScript を横断する言語機能 (CSS クラス名に対する Go to Definition や Find All References など) を提供します。

具体的には、TypeScript Language Service が Go to Definition などを呼び出すと、リクエストは Volar.js へ渡されます。Volar.js は、CSS ファイルの内容を `.d.ts` として表現した `VirtualCode` と、CSS クラス名と `.d.ts` 上の位置を対応付ける mapping を生成しています。これらを使い、`.d.ts` 上のシンボルの位置を CSS 上の位置に変換して TypeScript Language Service に返すことで、CSS と TypeScript を横断する言語機能を実現します。

## VirtualCode

`VirtualCode` は、CSS ファイルの内容を TypeScript の型定義ファイル (`.d.ts`) として表現したものです。その生成は [packages/core/src/dts-generator.ts](../packages/core/src/dts-generator.ts) の `generateDts()` で行われます。ここではその構造について説明します。

### 基本的な構造

以下のようなシンプルな CSS ファイルがあるとします。

`src/a.module.css`:

```css
.a_1 {
  color: red;
}
.a_2 {
  color: red;
}
```

このファイルに対して `generateDts()` を呼び出すと、次のような型定義が生成されます:

```ts
declare const styles = {
  'a_1': '',
  'a_2': '',
};
```

これにより、TypeScript Language Service が `styles` に対して `{ a_1: string; a_2: string; }` という型を割り当てることができます。

### Mapping

型定義だけでは、CSS クラス名と生成された TypeScript コードの位置を対応付けられず、Go to Definition や Find All References などの機能が正しく動作しません。そこで、`generateDts()` はその対応関係を表す mapping も生成します。

mapping は次のような構造を持ちます:

```ts
interface CodeMapping {
  generatedOffsets: number[]; // .d.ts 上でのコードのオフセット
  lengths: number[]; // .d.ts 上でのコードの長さ
  sourceOffsets: number[]; // CSS 上でのコードのオフセット
  sourceLengths?: number[]; // CSS 上でのコードの長さ (省略した場合は sourceOffsets と同じ長さとみなす)
}
```

先ほどの `src/a.module.css` から生成される `.d.ts` と mapping は次のようになります:

```ts
declare const styles = {
  'a_1': '',
  'a_2': '',
};
export default styles;
```

```ts
{ sourceOffsets: [1, 22], lengths: [3, 3], generatedOffsets: [28, 41] }
```

### `@import` のサポート

`@import` は別のスタイルシートを import するための構文です。シート全体が取り込まれるため、`src/a.module.css` で `@import './b.module.css'` と書くと、`./b.module.css` のトークンが `src/a.module.css` から export されます。CSS Modules Kit はこれを TypeScript の型として表現するために、取り込んだ CSS モジュールのトークンを丸ごと再 export する型定義を生成します。

例えば、次のような CSS モジュールがあるとします:

`src/a.module.css`:

```css
@import './b.module.css';
```

default export の場合、object spread で表現します:

```ts
function blockErrorType<T>(val: T): [0] extends [1 & T] ? {} : T;
declare const styles = {
  ...blockErrorType((await import('./b.module.css')).default),
};
```

named exports の場合、barrel re-export で表現します:

```ts
export * from './b.module.css';
```

### `blockErrorType` の役割

CSS Modules Kit は、`@import` の specifier が解決できるかどうかに関係なく、すべての `@import` を型定義に含めるという方針を採っています ([#302](https://github.com/mizdra/css-modules-kit/pull/302))。これにより、import 先のファイルが存在するかどうかで生成結果が変わらなくなり、watch モードの実装やコード生成の並列化が容易になります。

しかし、この方針には副作用があります。例えば、import 先のファイルが存在しなかったり、CSS Modules Kit の include/exclude にマッチしない場合、`(await import('./unresolved.module.css')).default` の型は `any` になります。これをそのまま spread すると、`styles` 全体の型も `any` に変質してしまい、本来存在するはずの `styles.a_1` などのトークンも `any` になってしまいます。

これを回避するために、CSS Modules Kit は `blockErrorType<T>` というヘルパーを生成コードに埋め込みます ([#303](https://github.com/mizdra/css-modules-kit/pull/303)):

```ts
function blockErrorType<T>(val: T): [0] extends [1 & T] ? {} : T;
```

このヘルパーは、`T` が `any` の場合は `{}` を、そうでない場合は `T` をそのまま返します。`{}` を spread しても他のプロパティの型は壊れないため、解決できない `@import` があっても `styles` 全体が `any` に変質することを防げます。

### `@value ... from ...` のサポート

`@value ... from ...` は別の CSS モジュールから特定のトークンだけを (必要に応じて別名で) import するための構文です。import したトークンは import 元のファイルから export されます。例えば `src/a.module.css` で `@value b_1, b_2 as aliased_b_2 from './b.module.css'` と書くと、`./b.module.css` の `b_1` が `b_1` として、`b_2` が `aliased_b_2` として `src/a.module.css` から export されます。CSS Modules Kit はこれを TypeScript の型として表現するために、指定したトークンだけを再 export する型定義を生成します。

例えば、次のような CSS モジュールがあるとします:

`src/a.module.css`:

```css
@value b_1, b_2 as aliased_b_2 from './b.module.css';
```

default export の場合、次のような型定義が生成されます:

```ts
declare const styles = {
  'b_1': (await import('./b.module.css')).default['b_1'],
  'aliased_b_2': (await import('./b.module.css')).default['b_2'],
};
```

named exports の場合、次のような型定義が生成されます:

```ts
export {
  'b_1' as 'b_1',
  'b_2' as 'aliased_b_2',
} from './b.module.css';
```

### LinkedCodeMapping

`generateDts()` は `LinkedCodeMapping` も生成します。これは、2つの異なるシンボルをリンクするための特別な mapping です。

```ts
interface LinkedCodeMapping {
  sourceOffsets: number[]; // .d.ts 上でのコードAのオフセット
  lengths: number[]; // .d.ts 上でのコードAの長さ
  generatedOffsets: number[]; // .d.ts 上でのコードBのオフセット
  generatedLengths: number[]; // .d.ts 上でのコードBの長さ
}
```

`LinkedCodeMapping` は、default export で `@value ... from ...` を使った場合などのエッジケースで使用されます。例えば、次のような CSS モジュールがあるとします:

`src/a.module.css`:

```css
@value b_1, b_2 as aliased_b_2 from './b.module.css';
```

`src/b.module.css`:

```css
.b_1 {
  color: red;
}
.b_2 {
  color: blue;
}
```

`generated/src/a.module.css.d.ts`:

```ts
declare const styles = {
  'b_1': (await import('./b.module.css')).default['b_1'],
  'aliased_b_2': (await import('./b.module.css')).default['b_2'],
};
```

この場合、以下のような `LinkedCodeMapping` が生成されます:

```ts
{ sourceOffsets: [27, 85], lengths: [5, 13], generatedOffsets: [75, 141], generatedLengths: [5, 5] }
```

これで `b_1` に対して Find All References をした時に `a.module.css` と `b.module.css` 上の両方の `b_1` が返されます。また `aliased_b_2` に対して Find All References をした時に、`a.module.css` 上の `b_2` と `aliased_b_2`、そして `b.module.css` 上の `b_2` が返されます。

### JavaScript Identifier として invalid なトークンのサポート

CSS クラス名は JavaScript の識別子として無効なトークンを含むことがあります (例: `a-1` など)。CSS Modules Kit ではこれらをサポートするために、トークンの名前をシングルクオートで囲んでいます。

default export の場合:

```ts
declare const styles = {
  'a-1': '',
};
```

named export の場合:

```ts
var _token_0: string;
export { _token_0 as 'a-1' };
```

### 同じトークンの複数回定義のサポート

同じトークンが複数回定義されている場合、Go to Definition でその全ての定義にジャンプできるべきです。例えば、次のようなファイルがあるとします。

`src/a.module.css`:

```css
.a_1 {
  color: red;
}
.a_1 {
  color: red;
}
```

`src/a.ts`:

```ts
import styles from './a.module.css';
styles.a_1;
```

`styles.a_1` に対して Go to Definition をした時に、`src/a.module.css` 上の両方の `.a_1` 定義にジャンプできるべきです。そのために CSS Modules Kit では default export の時、以下のような型定義ファイルと mapping を生成します:

`generated/src/a.module.css.d.ts`:

```ts
declare const styles = {
  'a_1': '',
  'a_1': '',
};
export default styles;
```

mapping:

```ts
{ sourceOffsets: [1, 24], lengths: [3, 3], generatedOffsets: [28, 41] }
```

named export の場合は、以下のようなコードと mapping を生成します:

`generated/src/a.module.css.d.ts`:

```ts
var _token_0: string;
var _token_0: string;
export { _token_0 as 'a_1' };
```

mapping:

```ts
{ sourceOffsets: [1, 24], lengths: [3, 3], generatedOffsets: [4, 26], generatedLengths: [8, 8] }
```

### クオートで囲まれた span の不一致とその回避策

CSS Modules Kit の生成する型定義には、`'a_1'` のようにクオートで囲まれたプロパティ名やトークン名が登場します。これに対し、TypeScript Language Service は API ごとに異なる span を返すという問題があります。

例えば、次のような型定義があるとします:

```ts
declare const styles = {
  'a_1': string,
};
```

`styles.a_1` の `a_1` に対する各 API の返り値は次のとおりです:

| API                       | span                       | クオートを含むか |
| ------------------------- | -------------------------- | ---------------- |
| `getDefinitionAtPosition` | `{ start: 27, length: 5 }` | Yes              |
| `findReferences`          | `{ start: 28, length: 3 }` | No               |
| `findRenameLocations`     | `{ start: 28, length: 3 }` | No               |

`getDefinitionAtPosition` だけがクオートを含む span を返します。これは TypeScript 自身の挙動です。

そして、この不一致が Volar.js の mapping と組み合わさると問題になります。例えば `{ generatedOffsets: [28], lengths: [3], sourceOffsets: [1] }` というクオートの内側だけをカバーする mapping を登録した場合:

- `findReferences` は `{ start: 28, length: 3 }` を返すので、mapping に直接マッチして CSS 上の位置 `1` に変換されます。
- `getDefinitionAtPosition` は `{ start: 27, length: 5 }` を返すので、mapping の範囲外となりマッチせず、CSS 上の位置を見つけられません。

逆にクオートを含む mapping を登録すると、今度は `findReferences` 側で誤った位置に変換されてしまいます。両方の range を 1 つの mapping にまとめても、Volar.js は単一の mapping 内のオーバーラップする range を扱えないため正しく動作しません ([volarjs/volar.js#203](https://github.com/volarjs/volar.js/issues/203))。

CSS Modules Kit ではこの問題を、

1. 登録する mapping にはクオートを含めない (上の例では offset 28, length 3 のみ)
2. Volar.js の mapper を差し替え、直接マッチしなかった時に外側 1 文字を剥がして再試行するフォールバックを追加する

という方針で回避しています。フォールバックは [packages/ts-plugin/src/source-map.ts](../packages/ts-plugin/src/source-map.ts) の `CustomSourceMap` で実装され、[packages/ts-plugin/src/index.cts](../packages/ts-plugin/src/index.cts) で `language.mapperFactory` を差し替えることで有効化されます。

これにより `getDefinitionAtPosition` の `{ start: 27, length: 5 }` も、内側の `{ start: 28, length: 3 }` で再試行することで mapping にマッチするようになります。

参考: [mizdra/volar-single-quote-span-problem](https://github.com/mizdra/volar-single-quote-span-problem)
