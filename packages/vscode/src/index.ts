/* eslint-disable no-console */

import * as vscode from 'vscode';

export function activate(_context: vscode.ExtensionContext) {
  console.log('[css-modules-kit-vscode] Activated');

  // By default, `vscode.typescript-language-features` is not activated when a user opens *.css in VS Code.
  // So, activate it manually.
  const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features');
  if (tsExtension) {
    console.log('[css-modules-kit-vscode] Activating `vscode.typescript-language-features`');
    tsExtension.activate();
  }
}
