/*---------------------------------------------------------
 * Copyright (C) Xored Software Inc. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

"use strict";

import vscode = require("coc.nvim");
import { Thenable } from "coc.nvim";
import { execNimSuggest, NimSuggestType } from "./nimSuggestExec";
import { getDirtyFile } from "./nimUtils";

export class NimSignatureHelpProvider implements vscode.SignatureHelpProvider {
  public provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Thenable<vscode.SignatureHelp> {
    return new Promise<vscode.SignatureHelp>((resolve, reject) => {
      var filename = vscode.Uri.parse(document.uri).fsPath;

      var currentArgument = 0;
      var identBeforeDot = "";
      {
        var lines = document.getText().split("\n");
        var cursorX = position.character - 1,
          cursorY = position.line;
        var line = lines[cursorY];
        var bracketsWithin = 0;
        while (line[cursorX] !== "(" || bracketsWithin !== 0) {
          if (
            (line[cursorX] === "," || line[cursorX] === ";") &&
            bracketsWithin === 0
          )
            currentArgument++;
          else if (line[cursorX] === ")") bracketsWithin++;
          else if (line[cursorX] === "(") bracketsWithin--;

          cursorX--;

          if (cursorX < 0) {
            if (cursorY - 1 < 0) {
              resolve({
                signatures: [],
                activeSignature: null,
                activeParameter: null,
              });
              return;
            }
            line = lines[--cursorY];
          }
        }

        var dotPosition = -1,
          start = -1;
        while (cursorX >= 0) {
          if (line[cursorX] === ".") {
            dotPosition = cursorX;
            break;
          }
          cursorX--;
        }

        while (cursorX >= 0 && dotPosition !== -1) {
          if (line[cursorX].search("[ \t({=]") !== -1) {
            start = cursorX + 1;
            break;
          }
          cursorX--;
        }

        if (start === -1) start = 0;

        if (start !== -1) {
          identBeforeDot = line.substring(start, dotPosition);
        }
      }

      execNimSuggest(
        NimSuggestType.con,
        filename,
        position.line + 1,
        position.character,
        getDirtyFile(document),
      )
        .then((items) => {
          var signatures: vscode.SignatureHelp = {
            signatures: [],
            activeSignature: null,
            activeParameter: null,
          };
          var isModule = 0;
          if (items && items.length > 0) signatures.activeSignature = 0;
          if (items) {
            items.forEach((item) => {
              var signature: vscode.SignatureInformation = {
                label: item.type,
                documentation: item.documentation,
                parameters: [],
              };

              var genericsCleanType = "";
              {
                var insideGeneric = 0;
                for (var i = 0; i < item.type.length; i++) {
                  if (item.type[i] === "[") insideGeneric++;
                  if (!insideGeneric) genericsCleanType += item.type[i];
                  if (item.type[i] === "]") insideGeneric--;
                }
              }

              var signatureCutDown =
                /(proc|macro|template|iterator|func) \((.+: .+)*\)/.exec(
                  genericsCleanType,
                );
              if (signatureCutDown) {
                var parameters = signatureCutDown[2].split(", ");
                parameters.forEach((parameter) => {
                  signature.parameters!.push({ label: parameter });
                });
              }

              if (
                item.names[0] === identBeforeDot ||
                item.path.search("/" + identBeforeDot + "/") !== -1 ||
                item.path.search("\\\\" + identBeforeDot + "\\\\") !== -1
              )
                isModule++;

              signatures.signatures.push(signature);
            });
          }
          signatures.activeParameter =
            isModule > 0 || identBeforeDot === ""
              ? currentArgument
              : currentArgument + 1;

          resolve(signatures);
        })
        .catch((reason) => reject(reason));
    });
  }
}
