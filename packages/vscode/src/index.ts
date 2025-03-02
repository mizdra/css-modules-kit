/* eslint-disable no-console */

import * as vscode from 'vscode';
import * as lsp from 'vscode-languageclient/node';

let client: lsp.BaseLanguageClient;

export async function activate(_context: vscode.ExtensionContext) {
  console.log('[@css-modules-kit/vscode] Activated');

  // By default, `vscode.typescript-language-features` is not activated when a user opens *.css in VS Code.
  // So, activate it manually.
  const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features');
  if (tsExtension) {
    console.log('[@css-modules-kit/vscode] Activating `vscode.typescript-language-features`');
    tsExtension.activate();
  }

  // Both vscode.css-language-features extension and tsserver receive "rename" requests for *.css.
  // If more than one Provider receives a "rename" request, VS Code will use one of them.
  // In this case, the extension is used to rename. However, we do not want this.
  // Without rename in tsserver, we cannot rename class selectors across *.css and *.ts.
  //
  // Also, VS Code seems to send "references" requests to both vscode.css-language-features extension
  // and tsserver and merge the results of both. Thus, when a user executes "Find all references"
  // on a class selector, the same class selector appears twice.
  //
  // To avoid this, we recommend disabling vscode.css-language-features extension. Disabling extensions is optional.
  // If not disabled, "rename" and "references" will behave in a way the user does not want.
  const cssExtension = vscode.extensions.getExtension('vscode.css-language-features');
  if (cssExtension) {
    // Temporarily commented out
    // vscode.window
    //   .showInformationMessage(
    //     '"Rename Symbol" and "Find All References" do not work in some cases because the "CSS Language Features" extension is enabled. Disabling the extension will make them work.',
    //     'Show "CSS Language Features" extension',
    //   )
    //   .then((selected) => {
    //     if (selected) {
    //       vscode.commands.executeCommand('workbench.extensions.search', '@builtin css-language-features');
    //     }
    //   });
  } else {
    // If vscode.css-language-features extension is disabled, start the customized language server for *.css, *.scss, and *.less.
    // The language server is based on the vscode-css-languageservice, but "rename" and "references" features are disabled.

    // TODO: Do not use Node.js API
    const serverModulePath = require.resolve('css-modules-kit-language-server');

    const serverOptions: lsp.ServerOptions = {
      run: {
        module: serverModulePath,
        transport: lsp.TransportKind.ipc,
        options: { execArgv: [] },
      },
      debug: {
        module: serverModulePath,
        transport: lsp.TransportKind.ipc,
        options: { execArgv: ['--nolazy', `--inspect=${6009}`] },
      },
    };
    const clientOptions: lsp.LanguageClientOptions = {
      documentSelector: [{ language: 'css' }, { language: 'scss' }, { language: 'less' }],
      initializationOptions: {},
    };
    client = new lsp.LanguageClient('@css-modules-kit/vscode', '@css-modules-kit/vscode', serverOptions, clientOptions);
    await client.start();
  }
}

export function deactivate(): Thenable<unknown> | undefined {
  return client?.stop();
}
