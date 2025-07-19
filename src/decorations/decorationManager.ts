import * as vscode from "vscode";
import { MethodAnalysis } from "../types";
import {
  excellentDecorationType,
  goodDecorationType,
  fairDecorationType,
  poorDecorationType,
  badDecorationType,
  terribleDecorationType,
} from "./textDecorations";

// Apply color decorations to complexity indicators
export function applyComplexityDecorations(
  editor: vscode.TextEditor,
  methods: MethodAnalysis[]
): void {
  const document = editor.document;

  // Clear existing decorations
  editor.setDecorations(excellentDecorationType, []);
  editor.setDecorations(goodDecorationType, []);
  editor.setDecorations(fairDecorationType, []);
  editor.setDecorations(poorDecorationType, []);
  editor.setDecorations(badDecorationType, []);
  editor.setDecorations(terribleDecorationType, []);

  const excellentRanges: vscode.Range[] = [];
  const goodRanges: vscode.Range[] = [];
  const fairRanges: vscode.Range[] = [];
  const poorRanges: vscode.Range[] = [];
  const badRanges: vscode.Range[] = [];
  const terribleRanges: vscode.Range[] = [];

  // Find complexity indicators in comments
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const text = line.text;

    // Look for complexity indicators in comments
    if (text.trim().startsWith("#") && text.includes("Time:")) {
      const excellentMatch = text.match(/EXCELLENT/g);
      const goodMatch = text.match(/GOOD/g);
      const fairMatch = text.match(/FAIR/g);
      const poorMatch = text.match(/POOR/g);
      const badMatch = text.match(/BAD/g);
      const terribleMatch = text.match(/TERRIBLE/g);

      if (excellentMatch) {
        let startIndex = 0;
        excellentMatch.forEach(() => {
          const index = text.indexOf("EXCELLENT", startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + "EXCELLENT".length)
            );
            excellentRanges.push(range);
            startIndex = index + "EXCELLENT".length;
          }
        });
      }

      if (goodMatch) {
        let startIndex = 0;
        goodMatch.forEach(() => {
          const index = text.indexOf("GOOD", startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + "GOOD".length)
            );
            goodRanges.push(range);
            startIndex = index + "GOOD".length;
          }
        });
      }

      if (fairMatch) {
        let startIndex = 0;
        fairMatch.forEach(() => {
          const index = text.indexOf("FAIR", startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + "FAIR".length)
            );
            fairRanges.push(range);
            startIndex = index + "FAIR".length;
          }
        });
      }

      if (poorMatch) {
        let startIndex = 0;
        poorMatch.forEach(() => {
          const index = text.indexOf("POOR", startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + "POOR".length)
            );
            poorRanges.push(range);
            startIndex = index + "POOR".length;
          }
        });
      }

      if (badMatch) {
        let startIndex = 0;
        badMatch.forEach(() => {
          const index = text.indexOf("BAD", startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + "BAD".length)
            );
            badRanges.push(range);
            startIndex = index + "BAD".length;
          }
        });
      }

      if (terribleMatch) {
        let startIndex = 0;
        terribleMatch.forEach(() => {
          const index = text.indexOf("TERRIBLE", startIndex);
          if (index !== -1) {
            const range = new vscode.Range(
              new vscode.Position(i, index),
              new vscode.Position(i, index + "TERRIBLE".length)
            );
            terribleRanges.push(range);
            startIndex = index + "TERRIBLE".length;
          }
        });
      }
    }
  }

  // Apply decorations
  editor.setDecorations(excellentDecorationType, excellentRanges);
  editor.setDecorations(goodDecorationType, goodRanges);
  editor.setDecorations(fairDecorationType, fairRanges);
  editor.setDecorations(poorDecorationType, poorRanges);
  editor.setDecorations(badDecorationType, badRanges);
  editor.setDecorations(terribleDecorationType, terribleRanges);
}
