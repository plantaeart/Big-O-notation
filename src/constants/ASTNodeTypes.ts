/**
 * AST Node Type Constants
 * Centralized constants for Tree-sitter Python AST node types
 */

export const AST_NODE_TYPES = {
  // Control Flow Statements
  FOR_STATEMENT: "for_statement",
  WHILE_STATEMENT: "while_statement",
  IF_STATEMENT: "if_statement",

  // Expression Types
  EXPRESSION_STATEMENT: "expression_statement",
  ASSIGNMENT: "assignment",
  CALL: "call",
  BINARY_OPERATOR: "binary_operator",
  SUBSCRIPT: "subscript",
  RETURN_STATEMENT: "return_statement",

  // Comprehensions
  LIST_COMPREHENSION: "list_comprehension",
  SET_COMPREHENSION: "set_comprehension",
  DICTIONARY_COMPREHENSION: "dictionary_comprehension",
  GENERATOR_EXPRESSION: "generator_expression",

  // Function and Class Definitions
  FUNCTION_DEFINITION: "function_definition",
  CLASS_DEFINITION: "class_definition",

  // Data Structures
  LIST: "list",
  DICTIONARY: "dictionary",
  SET: "set",
  TUPLE: "tuple",

  // Other Common Types
  IDENTIFIER: "identifier",
  STRING: "string",
  INTEGER: "integer",
  BLOCK: "block",
} as const;

/**
 * Collections of related AST node types for common patterns
 */
export const AST_NODE_GROUPS = {
  // All loop types
  LOOPS: [AST_NODE_TYPES.FOR_STATEMENT, AST_NODE_TYPES.WHILE_STATEMENT],

  // All comprehension types
  COMPREHENSIONS: [
    AST_NODE_TYPES.LIST_COMPREHENSION,
    AST_NODE_TYPES.SET_COMPREHENSION,
    AST_NODE_TYPES.DICTIONARY_COMPREHENSION,
  ],

  // All statement types that can contain complexity
  STATEMENTS: [
    AST_NODE_TYPES.EXPRESSION_STATEMENT,
    AST_NODE_TYPES.ASSIGNMENT,
    AST_NODE_TYPES.RETURN_STATEMENT,
  ],

  // All data structure types
  DATA_STRUCTURES: [
    AST_NODE_TYPES.LIST,
    AST_NODE_TYPES.DICTIONARY,
    AST_NODE_TYPES.SET,
    AST_NODE_TYPES.TUPLE,
  ],
} as const;
