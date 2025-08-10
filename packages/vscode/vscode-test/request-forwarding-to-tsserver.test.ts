/**
 * @fileoverview
 * This file tests the "Request Forwarding to tsserver" technique (https://github.com/mizdra/css-modules-kit/pull/207).
 * It verifies that the following issues do not occur:
 *
 * - https://github.com/mizdra/css-modules-kit/issues/121
 * - https://github.com/mizdra/css-modules-kit/issues/206
 *
 * The workspace used is `examples/4-multiple-tsconfig` to ensure that these issues do not occur in a workspace
 * with multiple tsconfig.json files.
 *
 */

import * as assert from 'node:assert/strict';
import { before, describe, it } from 'mocha';
import * as vscode from 'vscode';
import { toObject } from './util.js';

const workspaceRoot = vscode.workspace.workspaceFolders![0]!.uri;
const aModuleCSS1Path = vscode.Uri.joinPath(workspaceRoot, 'src/dir-1/a.module.css');
const bModuleCSS1Path = vscode.Uri.joinPath(workspaceRoot, 'src/dir-1/b.module.css');
const cModuleCSS1Path = vscode.Uri.joinPath(workspaceRoot, 'src/dir-1/c.module.css');
const aTSX1Path = vscode.Uri.joinPath(workspaceRoot, 'src/dir-1/a.tsx');
const aModuleCSS2Path = vscode.Uri.joinPath(workspaceRoot, 'src/dir-2/a.module.css');
const bModuleCSS2Path = vscode.Uri.joinPath(workspaceRoot, 'src/dir-2/b.module.css');
const aTSX2Path = vscode.Uri.joinPath(workspaceRoot, 'src/dir-2/a.tsx');

type RangeWithPlaceholder = { range: vscode.Range; placeholder: string };

before(async () => {
  const cmkExtension = vscode.extensions.getExtension('mizdra.css-modules-kit-vscode')!;
  await cmkExtension.activate();
});

describe('Renaming class in .module.css', () => {
  it('affects corresponding .tsx file', async () => {
    const aModuleCSSDocument = await vscode.workspace.openTextDocument(aModuleCSS1Path);
    const aTSXDocument = await vscode.workspace.openTextDocument(aTSX1Path);
    const position = new vscode.Position(0, 1); // `a_1`

    const rangeAndPlaceholder = await vscode.commands.executeCommand<RangeWithPlaceholder>(
      'vscode.prepareRename',
      aModuleCSS1Path,
      position,
    );
    assert.deepEqual(
      toObject(rangeAndPlaceholder.range),
      toObject(new vscode.Range(0, 1, 0, 4)), // `a_1`
    );

    const workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      'vscode.executeDocumentRenameProvider',
      aModuleCSS1Path,
      position,
      'a_1_renamed',
    );
    const success = await vscode.workspace.applyEdit(workspaceEdit);

    assert.ok(success);
    assert.ok(aModuleCSSDocument.getText().includes('.a_1_renamed'));
    assert.ok(aTSXDocument.getText().includes('a_1_renamed'));
  });
  it('works in other projects', async () => {
    const aModuleCSSDocument = await vscode.workspace.openTextDocument(aModuleCSS2Path);
    const aTSXDocument = await vscode.workspace.openTextDocument(aTSX2Path);
    const position = new vscode.Position(0, 1); // `a_1`

    const rangeAndPlaceholder = await vscode.commands.executeCommand<RangeWithPlaceholder>(
      'vscode.prepareRename',
      aModuleCSS2Path,
      position,
    );
    assert.deepEqual(
      toObject(rangeAndPlaceholder.range),
      toObject(new vscode.Range(0, 1, 0, 4)), // `a_1`
    );

    const workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      'vscode.executeDocumentRenameProvider',
      aModuleCSS2Path,
      position,
      'a_1_renamed',
    );
    const success = await vscode.workspace.applyEdit(workspaceEdit);

    assert.ok(success);
    assert.ok(aModuleCSSDocument.getText().includes('.a_1_renamed'));
    assert.ok(aTSXDocument.getText().includes('a_1_renamed'));
  });
  it('can rename by standard CSS Language Server', async () => {
    const aModuleCSSDocument = await vscode.workspace.openTextDocument(aModuleCSS1Path);
    const position = new vscode.Position(0, 7); // `color`

    // CSS Language Server does not support `prepareRename`, so we skip testing it.

    const workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      'vscode.executeDocumentRenameProvider',
      aModuleCSS1Path,
      position,
      'color-renamed',
    );
    const success = await vscode.workspace.applyEdit(workspaceEdit);

    assert.ok(success);
    assert.ok(aModuleCSSDocument.getText().includes('color-renamed'));
  });
});

describe('Go to Definition for specifiers with import alias', () => {
  it('resolves to the correct .module.css file', async () => {
    await vscode.workspace.openTextDocument(aModuleCSS1Path);
    const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>(
      'vscode.executeLinkProvider',
      aModuleCSS1Path,
    );

    assert.equal(links.length, 1);
    assert.ok(links[0]!.target?.toString() === bModuleCSS1Path.toString());
    assert.deepEqual(
      toObject(links[0]!.range),
      toObject(new vscode.Range(2, 9, 2, 33)), // `@/src/dir-1/b.module.css`
    );
  });
  it('works in other projects', async () => {
    await vscode.workspace.openTextDocument(aModuleCSS2Path);
    const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>(
      'vscode.executeLinkProvider',
      aModuleCSS2Path,
    );

    assert.equal(links.length, 1);
    assert.ok(links[0]!.target?.toString() === bModuleCSS2Path.toString());
    assert.deepEqual(
      toObject(links[0]!.range),
      toObject(new vscode.Range(2, 9, 2, 33)), // `@/src/dir-2/b.module.css`
    );
  });
  it('`executeLinkProvider` also returns links from standard CSS Language Server', async () => {
    await vscode.workspace.openTextDocument(cModuleCSS1Path);
    const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>(
      'vscode.executeLinkProvider',
      cModuleCSS1Path,
    );

    assert.equal(links.length, 2);
    assert.ok(links[0]!.target?.toString() === vscode.Uri.parse('https://test.example/image.png').toString());
    assert.deepEqual(
      toObject(links[0]!.range),
      toObject(new vscode.Range(0, 23, 0, 55)), // `'https://test.example/image.png'`
    );
    assert.ok(links[1]!.target?.toString() === bModuleCSS1Path.toString());
    assert.deepEqual(
      toObject(links[1]!.range),
      toObject(new vscode.Range(2, 9, 2, 33)), // `@/src/dir-1/b.module.css`
    );
  });
});
