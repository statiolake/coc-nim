/*---------------------------------------------------------
 * Copyright (C) Xored Software Inc. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

"use strict";

import vscode = require("coc.nvim");

import { findWorkspaceSymbols, getFileSymbols } from "./nimIndexer";
import { getDirtyFile } from "./nimUtils";

export class NimWorkspaceSymbolProvider
  implements vscode.WorkspaceSymbolProvider
{
  public provideWorkspaceSymbols(
    query: string,
    token: vscode.CancellationToken,
  ): Thenable<vscode.SymbolInformation[]> {
    return findWorkspaceSymbols(query);
  }
}

export class NimDocumentSymbolProvider
  implements vscode.DocumentSymbolProvider
{
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): Thenable<vscode.SymbolInformation[]> {
    return getFileSymbols(document.fileName, getDirtyFile(document));
  }
}
