// Jest setup file
// This file runs before each test

// Mock VS Code module since we're running unit tests outside of VS Code
jest.mock(
  "vscode",
  () => ({
    window: {
      showInformationMessage: jest.fn(),
      showWarningMessage: jest.fn(),
      showErrorMessage: jest.fn(),
    },
    workspace: {
      getConfiguration: jest.fn(() => ({
        get: jest.fn((key: string) => {
          const defaults: { [key: string]: any } = {
            autoRecomputeOnSave: true,
          };
          return defaults[key];
        }),
      })),
    },
  }),
  { virtual: true }
);

// Increase timeout for complex operations
jest.setTimeout(30000);
