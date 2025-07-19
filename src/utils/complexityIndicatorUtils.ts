export const getMatchDecorationType = (
  text: string,
  pattern: string
): RegExpMatchArray | null => {
  return text.match(new RegExp(pattern, "g"));
};
