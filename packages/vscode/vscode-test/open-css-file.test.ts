/**
 * @fileoverview
 * This file tests the behavior of the Extension when a .css file is opened.
 */

import * as assert from 'node:assert/strict';
import { it } from 'mocha';
import * as vscode from 'vscode';
import { toObject, waitFor } from './util.js';

const workspaceRoot = vscode.workspace.workspaceFolders![0]!.uri;
const aModuleCSSPath = vscode.Uri.joinPath(workspaceRoot, 'src/a.module.css');
const aTSXPath = vscode.Uri.joinPath(workspaceRoot, 'src/a.tsx');

it('loads ts-plugin if .css file is opened', async () => {
  const aModuleCSSDocument = await vscode.workspace.openTextDocument(aModuleCSSPath);
  await vscode.window.showTextDocument(aModuleCSSDocument);

  // Wait for the ts-plugin to be loaded and the definition provider to be registered
  const locations = await waitFor(async () => {
    const locations = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider',
      aModuleCSSPath,
      new vscode.Position(0, 1), // `a_1`
    );
    assert.equal(locations.length, 3);
    return locations;
  });

  // NOTE: `locations` is a merge of the "references" responses from both tsserver and the standard CSS Language Server.
  // Therefore, not only `a_1` but also `.a_1` is included in `locations`. This is unexpected behavior, but it is
  // difficult to fix.
  assert.equal(locations[0]!.uri.toString(), aModuleCSSPath.toString());
  assert.deepEqual(
    toObject(locations[0]!.range),
    toObject(new vscode.Range(0, 0, 0, 4)), // `.a_1`
  );
  assert.equal(locations[1]!.uri.toString(), aModuleCSSPath.toString());
  assert.deepEqual(
    toObject(locations[1]!.range),
    toObject(new vscode.Range(0, 1, 0, 4)), // `a_1`
  );
  assert.equal(locations[2]!.uri.toString(), aTSXPath.toString());
  assert.deepEqual(
    toObject(locations[2]!.range),
    toObject(new vscode.Range(2, 7, 2, 10)), // `a_1`
  );
});
