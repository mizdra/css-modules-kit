/* eslint-disable no-console */

import type {
  CSSModulesKitDocumentLinkRequest,
  CSSModulesKitDocumentLinkResponse,
  CSSModulesKitRenameInfoRequest,
  CSSModulesKitRenameInfoResponse,
  CSSModulesKitRenameRequest,
  CSSModulesKitRenameResponse,
} from '@css-modules-kit/ts-plugin/type';
import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext) {
  console.log('[css-modules-kit-vscode] Activated');

  // By default, `vscode.typescript-language-features` is not activated when a user opens *.css in VS Code.
  // So, activate it manually.
  const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features');
  if (tsExtension && !tsExtension.isActive) {
    console.log('[css-modules-kit-vscode] Activating `vscode.typescript-language-features`');
    await tsExtension.activate();
  }

  context.subscriptions.push(
    vscode.languages.registerRenameProvider(
      { scheme: 'file', language: 'css' },
      {
        async provideRenameEdits(document, position, newName, _token) {
          const res = await vscode.commands.executeCommand<CSSModulesKitRenameResponse>(
            'typescript.tsserverRequest',
            '_css-modules-kit:rename',
            {
              fileName: document.fileName,
              position: document.offsetAt(position),
            } satisfies CSSModulesKitRenameRequest['arguments'],
          );
          if (!res.success || !res.body.result) return;
          const edit = new vscode.WorkspaceEdit();
          for (const location of res.body.result) {
            // eslint-disable-next-line no-await-in-loop
            const document = await vscode.workspace.openTextDocument(location.fileName);
            const start = document.positionAt(location.textSpan.start);
            const end = document.positionAt(location.textSpan.start + location.textSpan.length);
            edit.replace(vscode.Uri.file(location.fileName), new vscode.Range(start, end), newName);
          }
          return edit;
        },
        async prepareRename(document, position, _token) {
          const res = await vscode.commands.executeCommand<CSSModulesKitRenameInfoResponse>(
            'typescript.tsserverRequest',
            '_css-modules-kit:renameInfo',
            {
              fileName: document.fileName,
              position: document.offsetAt(position),
            } satisfies CSSModulesKitRenameInfoRequest['arguments'],
          );
          if (!res.success || !res.body.result.canRename) return;
          return new vscode.Range(
            document.positionAt(res.body.result.triggerSpan.start),
            document.positionAt(res.body.result.triggerSpan.start + res.body.result.triggerSpan.length),
          );
        },
      },
    ),
    vscode.languages.registerDocumentLinkProvider(
      { scheme: 'file', language: 'css' },
      {
        async provideDocumentLinks(document, _token) {
          const res = await vscode.commands.executeCommand<CSSModulesKitDocumentLinkResponse>(
            'typescript.tsserverRequest',
            '_css-modules-kit:documentLink',
            {
              fileName: document.fileName,
            } satisfies CSSModulesKitDocumentLinkRequest['arguments'],
          );
          if (!res.success || !res.body.result) return [];
          return res.body.result.map((link) => {
            return new vscode.DocumentLink(
              new vscode.Range(
                document.positionAt(link.textSpan.start),
                document.positionAt(link.textSpan.start + link.textSpan.length),
              ),
              vscode.Uri.file(link.fileName),
            );
          });
        },
      },
    ),
  );
}
