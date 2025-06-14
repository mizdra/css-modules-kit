## throw するエラーは Error クラスを継承したクラスを使う

- エラーを throw する場合は、`Error` クラスを継承したクラスを使ってください
- エラークラスは、`src/error.ts` に配置してください

```ts
// src/error.ts
class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
```

## エラーを throw する時は `@throws` を記述する

throw する関数に、いつ例外が throw されるのかを JSDoc の `@throws` で説明してください。

```ts
/**
 * @throws {AuthError} When the user is not authorized
 */
function myFunction() {
  if (!user.isAuthorized()) {
    throw new AuthError('User is not authorized');
  }
}
```

## 呼び出し元の関数にも `@throws` を記述する

エラーが throw される関数を呼び出す時、呼び出し元の関数の JSDoc にも `@throws` を記述してください。

```ts
/**
 * @throws {AuthError} When the user is not authorized
 */
function myFunction1() {
  anotherFunction();
}

function myFunction2() {
  try {
    anotherFunction();
  } catch (e) {
    // error handling
  }
}

/**
 * @throws {AuthError} When the user is not authorized
 */
function anotherFunction() {
  if (!user.isAuthorized()) {
    throw new AuthError('User is not authorized');
  }
}
```
