export interface CelExpression {
  leftOperand?: string;
  description?: string;
  expression?: string;
  scopes?: Array<string>;
  '@context'?: Array<string>;
  '@type'?: string;
  '@id'?: string;
}
