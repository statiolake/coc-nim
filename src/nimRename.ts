"use strict";

import vscode = require("coc.nvim");
import { Thenable } from "coc.nvim";
import { execNimSuggest, NimSuggestType } from "./nimSuggestExec";
import { getDirtyFile } from "./nimUtils";

export class NimRenameProvider implements vscode.RenameProvider {
  public provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
    token: vscode.CancellationToken,
  ): Thenable<vscode.WorkspaceEdit> {
    return new Promise<vscode.WorkspaceEdit>((resolve, reject) => {
      vscode.workspace.nvim.command("writeall").then(() => {
        execNimSuggest(
          NimSuggestType.use,
          vscode.Uri.parse(document.uri).fsPath,
          position.line + 1,
          position.character,
          getDirtyFile(document),
        )
          .then((result) => {
            var references: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
            if (result) {
              result.forEach((item) => {
                let endPosition = new vscode.Position(
                  item.range.end.line,
                  item.range.end.character + item.symbolName.length,
                );
                references.replace(
                  item.uri,
                  new vscode.Range(item.range.start, endPosition),
                  newName,
                );
              });
              resolve(references);
            } else {
              resolve();
            }
          })
          .catch((reason) => reject(reason));
      });
    });
  }
}
