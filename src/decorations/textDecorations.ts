import * as vscode from "vscode";

// Create decoration types for different complexity levels
export const excellentDecorationType =
  vscode.window.createTextEditorDecorationType({
    color: "#22C55E", // Green
    fontWeight: "bold",
  });

export const goodDecorationType = vscode.window.createTextEditorDecorationType({
  color: "#EAB308", // Yellow
  fontWeight: "bold",
});

export const fairDecorationType = vscode.window.createTextEditorDecorationType({
  color: "#F97316", // Orange
  fontWeight: "bold",
});

export const poorDecorationType = vscode.window.createTextEditorDecorationType({
  color: "#EF4444", // Red
  fontWeight: "bold",
});

export const badDecorationType = vscode.window.createTextEditorDecorationType({
  color: "#DC2626", // Dark Red
  fontWeight: "bold",
});

export const terribleDecorationType =
  vscode.window.createTextEditorDecorationType({
    color: "#7F1D1D", // Very Dark Red
    fontWeight: "bold",
  });

export const unknownDecorationType =
  vscode.window.createTextEditorDecorationType({
    color: "#6B7280", // Gray
    fontWeight: "bold",
  });
