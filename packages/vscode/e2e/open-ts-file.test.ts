/**
 * @fileoverview
 * This file tests the behavior of the Extension when a .ts file is opened.
 */

import * as assert from 'node:assert/strict';
import { it } from 'mocha';
import * as vscode from 'vscode';
import { toObject, waitFor } from './util.js';

const workspaceRoot = vscode.workspace.workspaceFolders![0]!.uri;
const aModuleCSSPath = vscode.Uri.joinPath(workspaceRoot, 'src/a.module.css');
const aTSXPath = vscode.Uri.joinPath(workspaceRoot, 'src/a.tsx');

it('loads ts-plugin if .ts file is opened', async () => {
  const aTSXDocument = await vscode.workspace.openTextDocument(aTSXPath);
  await vscode.window.showTextDocument(aTSXDocument);

  // Wait for the ts-plugin to be loaded and the definition provider to be registered
  const locations = await waitFor(async () => {
    const locations = await vscode.commands.executeCommand<vscode.LocationLink[]>(
      'vscode.executeDefinitionProvider',
      aTSXPath,
      new vscode.Position(2, 7), // `a_1`
    );
    assert.equal(locations.length, 1);
    return locations;
  });

  assert.equal(locations[0]!.targetUri.toString(), aModuleCSSPath.toString());
  assert.deepEqual(
    toObject(locations[0]!.targetSelectionRange),
    toObject(new vscode.Range(0, 1, 0, 4)), // `a_1`
  );
});
