/*---------------------------------------------------------
 * Copyright (C) Xored Software Inc. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

"use strict";

import vscode = require("coc.nvim");
import { Thenable } from "coc.nvim";
import { getImports } from "./nimImports";
import {
  NimSuggestResult,
  NimSuggestType,
  execNimSuggest,
} from "./nimSuggestExec";
import { getDirtyFile, getProjectFileInfo } from "./nimUtils";

export class NimCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  public provideCompletionItems(
    textDocument: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Thenable<vscode.CompletionItem[]> {
    return new Promise<vscode.CompletionItem[]>((resolve, reject) => {
      const document = vscode.workspace.getDocument(textDocument.uri);
      var filename = vscode.Uri.parse(document.uri).fsPath;
      let range = document.getWordRangeAtPosition(position);
      let txt = range
        ? document.textDocument.getText(range).toLowerCase()
        : undefined;
      let line = document.textDocument.lineAt(position).text;
      if (line.startsWith("import ")) {
        let txtPart =
          txt && range
            ? document.textDocument
                .getText({ ...range, end: position })
                .toLowerCase()
            : undefined;
        resolve(
          getImports(
            txtPart,
            vscode.Uri.parse(getProjectFileInfo(filename).wsFolder.uri).fsPath,
          ),
        );
      } else {
        execNimSuggest(
          NimSuggestType.sug,
          filename,
          position.line + 1,
          position.character,
          getDirtyFile(document.textDocument),
        )
          .then((items) => {
            var suggestions: vscode.CompletionItem[] = [];
            if (items) {
              items.forEach((item) => {
                if (
                  item.answerType === "sug" &&
                  (!txt || item.symbolName.toLowerCase().indexOf(txt) >= 0) &&
                  /[a-z]/i.test(item.symbolName)
                ) {
                  var suggestion: vscode.CompletionItem = {
                    label: item.symbolName,
                  };
                  suggestion.kind = vscodeKindFromNimSym(item.suggest);
                  suggestion.detail = nimSymDetails(item);
                  suggestion.sortText = ("0000" + suggestions.length).slice(-4);
                  // use predefined text to disable suggest sorting
                  suggestion.documentation = {
                    kind: "markdown",
                    value: item.documentation,
                  };
                  suggestions.push(suggestion);
                }
              });
            }
            if (suggestions.length > 0) {
              resolve(suggestions);
            } else {
              reject();
            }
          })
          .catch((reason) => reject(reason));
      }
    });
  }
}

function vscodeKindFromNimSym(kind: string): vscode.CompletionItemKind {
  switch (kind) {
    case "skConst":
      return vscode.CompletionItemKind.Value;
    case "skEnumField":
      return vscode.CompletionItemKind.Enum;
    case "skForVar":
      return vscode.CompletionItemKind.Variable;
    case "skIterator":
      return vscode.CompletionItemKind.Keyword;
    case "skLabel":
      return vscode.CompletionItemKind.Keyword;
    case "skLet":
      return vscode.CompletionItemKind.Value;
    case "skMacro":
      return vscode.CompletionItemKind.Snippet;
    case "skMethod":
      return vscode.CompletionItemKind.Method;
    case "skParam":
      return vscode.CompletionItemKind.Variable;
    case "skProc":
      return vscode.CompletionItemKind.Function;
    case "skResult":
      return vscode.CompletionItemKind.Value;
    case "skTemplate":
      return vscode.CompletionItemKind.Snippet;
    case "skType":
      return vscode.CompletionItemKind.Class;
    case "skVar":
      return vscode.CompletionItemKind.Field;
    case "skFunc":
      return vscode.CompletionItemKind.Function;
  }
  return vscode.CompletionItemKind.Property;
}

function nimSymDetails(suggest: NimSuggestResult): string {
  switch (suggest.suggest) {
    case "skConst":
      return "const " + suggest.fullName + ": " + suggest.type;
    case "skEnumField":
      return "enum " + suggest.type;
    case "skForVar":
      return "for var of " + suggest.type;
    case "skIterator":
      return suggest.type;
    case "skLabel":
      return "label";
    case "skLet":
      return "let of " + suggest.type;
    case "skMacro":
      return "macro";
    case "skMethod":
      return suggest.type;
    case "skParam":
      return "param";
    case "skProc":
      return suggest.type;
    case "skResult":
      return "result";
    case "skTemplate":
      return suggest.type;
    case "skType":
      return "type " + suggest.fullName;
    case "skVar":
      return "var of " + suggest.type;
  }
  return suggest.type;
}
