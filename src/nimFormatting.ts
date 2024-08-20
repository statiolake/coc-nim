/*---------------------------------------------------------
 * Copyright (C) Xored Software Inc. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

"use strict";

import vscode = require("coc.nvim");
import cp = require("child_process");
import fs = require("fs");
import { Thenable } from "coc.nvim";
import { fullRange, getDirtyFile, getNimPrettyExecPath } from "./nimUtils";

export class NimFormattingProvider
  implements vscode.DocumentFormattingEditProvider
{
  public provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken,
  ): vscode.TextEdit[] | Thenable<vscode.TextEdit[]> {
    return new Promise((resolve, reject) => {
      if (getNimPrettyExecPath() === "") {
        vscode.window.showInformationMessage(
          "No 'nimpretty' binary could be found in PATH environment variable",
        );
        resolve([]);
      } else {
        let file = getDirtyFile(document);
        let config = vscode.workspace.getConfiguration("nim");
        let res = cp.spawnSync(
          getNimPrettyExecPath(),
          [
            "--backup:OFF",
            "--indent:" + config["nimprettyIndent"],
            "--maxLineLen:" + config["nimprettyMaxLineLen"],
            file,
          ],
          { cwd: vscode.workspace.rootPath },
        );

        if (res.status !== 0) {
          reject(res.error);
        } else {
          if (!fs.existsSync(file)) {
            reject(file + " file not found");
          } else {
            let content = fs.readFileSync(file, "utf-8");
            let range = fullRange(document);
            resolve([vscode.TextEdit.replace(range, content)]);
          }
        }
      }
    });
  }
}
