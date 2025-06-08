/* eslint-disable no-console */

import * as vscode from 'vscode';
import * as lsp from 'vscode-languageclient/node';

let client: lsp.BaseLanguageClient;

const ORIGINAL_SCHEME = 'css-modules-kit';

type RangeOrRangeWithPlaceholder =
  | vscode.Range
  | {
      range: vscode.Range;
      placeholder: string;
    };

export async function activate(context: vscode.ExtensionContext) {
  console.log('[css-modules-kit-vscode] Activated');

  // By default, `vscode.typescript-language-features` is not activated when a user opens *.css in VS Code.
  // So, activate it manually.
  const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features');
  if (tsExtension) {
    console.log('[css-modules-kit-vscode] Activating `vscode.typescript-language-features`');
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
    // Both vscode.css-language-features and tsserver subscribe to LSP requests for .css and return responses.
    //
    // For requests like "completion" or "references" the merged results of the two responses are displayed
    // to the user. However, for certain types of requests like "rename" or "documentLink" the response
    // from one Language Server takes precedence. Which Language Server is prioritized is determined by scoring.
    //
    // - https://github.com/microsoft/vscode/issues/115354
    //
    // Limiting the discussion to vscode.css-language-features and tsserver, it seems that
    // vscode.css-language-features takes precedence. As a result, "rename" and "documentLink"
    // behave unexpectedly.
    //
    // - https://github.com/mizdra/css-modules-kit/issues/121
    // - Case 1 in https://github.com/mizdra/css-modules-kit/issues/133
    //
    // Therefore, in this case, we use the VS Code extension API to intercept "rename" and "documentLink"
    // requests and redirect them to tsserver. This technique is known as "Request Forwarding".
    //
    // - https://code.visualstudio.com/api/language-extensions/embedded-languages#request-forwarding
    //
    // Using Request Forwarding, "rename" and "documentLink" now work as expected.
    vscode.workspace.registerTextDocumentContentProvider(ORIGINAL_SCHEME, {
      async provideTextDocumentContent(uri) {
        // `uri.fsPath` is in the format `/path/to/file.module.css.ts`.
        const actualFilePath = uri.fsPath.slice(0, -3); // Remove the '.ts' extension
        const actualFileDocument = await vscode.workspace.openTextDocument(actualFilePath);
        const text = actualFileDocument.getText();
        return text;
      },
    });
    context.subscriptions.push(
      vscode.languages.registerRenameProvider(['css'], {
        provideRenameEdits(document, position, newName, _token) {
          // NOTE: Executing `executeDocumentRenameProvider` on a virtual text document causes a runtime error. This is probably a bug in vscode.
          return vscode.commands.executeCommand<vscode.WorkspaceEdit>(
            'vscode.executeDocumentRenameProvider',
            vscode.Uri.parse(`${ORIGINAL_SCHEME}://${document.fileName}.ts`),
            position,
            newName,
          );
        },
        prepareRename(document, position, _token) {
          return vscode.commands.executeCommand<RangeOrRangeWithPlaceholder>(
            'vscode.prepareRename',
            vscode.Uri.parse(`${ORIGINAL_SCHEME}://${document.fileName}.ts`),
            position,
          );
        },
      }),
      vscode.languages.registerDocumentLinkProvider(['css'], {
        async provideDocumentLinks(document, _token) {
          // NOTE: Executing `executeDocumentLinkProvider` on a virtual text document, an empty array is always returned. This is probably a bug in vscode.
          return vscode.commands.executeCommand<vscode.Location[]>(
            'vscode.executeLinkProvider',
            vscode.Uri.parse(`${ORIGINAL_SCHEME}://${document.fileName}.ts`),
          );
        },
      }),
    );
  } else {
    // If vscode.css-language-features extension is disabled, start the customized language server for *.css, *.scss, and *.less.
    // The language server is based on the vscode-css-languageservice, but "rename" and "references" features are disabled.

    // TODO: Do not use Node.js API
    const serverModulePath = require.resolve('@css-modules-kit/language-server');

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
    client = new lsp.LanguageClient('css-modules-kit-vscode', 'css-modules-kit-vscode', serverOptions, clientOptions);
    await client.start();
  }
}

export function deactivate(): Thenable<unknown> | undefined {
  return client?.stop();
}
