/**
 * parser.js
 * Converts a regex string to a postfix token array ready for Thompson's construction.
 *
 * Supported operators:
 *   |       alternation
 *   +       alternation (infix) or one-or-more (postfix), based on context
 *   *       Kleene star (postfix)
 *   ?       zero-or-one (postfix)
 *   ()      grouping
 *   \x      escape next character and treat it as a literal symbol
 *   ε       literal epsilon (treated as an ε-transition unless escaped)
 *   everything else = literal symbol
 *
 * Implicit concatenation is made explicit before the shunting-yard step so
 * the postfix evaluator only needs binary and unary operators.
 */

export const EPSILON = '\x00';
export const EPSILON_LABEL = '\u03b5';

const TOKEN = {
  LITERAL: 'literal',
  UNION: 'union',
  CONCAT: 'concat',
  STAR: 'star',
  PLUS: 'plus',
  QUESTION: 'question',
  LEFT: 'leftParen',
  RIGHT: 'rightParen',
};

const PREC = {
  [TOKEN.UNION]: 1,
  [TOKEN.CONCAT]: 2,
  [TOKEN.STAR]: 3,
  [TOKEN.PLUS]: 3,
  [TOKEN.QUESTION]: 3,
};

function literal(value) {
  return { type: TOKEN.LITERAL, value };
}

function operator(type) {
  return { type };
}

function isWhitespace(char) {
  return /\s/.test(char);
}

function canStartOperand(token) {
  return token.type === TOKEN.LITERAL || token.type === TOKEN.LEFT;
}

function canEndOperand(token) {
  return (
    token.type === TOKEN.LITERAL ||
    token.type === TOKEN.RIGHT ||
    token.type === TOKEN.STAR ||
    token.type === TOKEN.PLUS ||
    token.type === TOKEN.QUESTION
  );
}

function peekNextToken(chars, startIndex) {
  for (let index = startIndex; index < chars.length; index += 1) {
    const char = chars[index];

    if (isWhitespace(char)) {
      continue;
    }

    if (char === '\\') {
      if (index + 1 >= chars.length) {
        throw new Error('Trailing escape character');
      }
      return literal(chars[index + 1]);
    }

    switch (char) {
      case '(':
        return operator(TOKEN.LEFT);
      case ')':
        return operator(TOKEN.RIGHT);
      case '|':
        return operator(TOKEN.UNION);
      case '*':
        return operator(TOKEN.STAR);
      case '?':
        return operator(TOKEN.QUESTION);
      case '+':
        return operator('ambiguousPlus');
      case EPSILON_LABEL:
        return literal(EPSILON);
      default:
        return literal(char);
    }
  }

  return null;
}

export function tokenize(regex) {
  const chars = [...regex];
  const tokens = [];

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];

    if (isWhitespace(char)) {
      continue;
    }

    if (char === '\\') {
      index += 1;
      if (index >= chars.length) {
        throw new Error('Trailing escape character');
      }
      tokens.push(literal(chars[index]));
      continue;
    }

    if (char === EPSILON_LABEL) {
      tokens.push(literal(EPSILON));
      continue;
    }

    switch (char) {
      case '(':
        tokens.push(operator(TOKEN.LEFT));
        break;
      case ')':
        tokens.push(operator(TOKEN.RIGHT));
        break;
      case '|':
        tokens.push(operator(TOKEN.UNION));
        break;
      case '*':
        tokens.push(operator(TOKEN.STAR));
        break;
      case '?':
        tokens.push(operator(TOKEN.QUESTION));
        break;
      case '+': {
        const previous = tokens.at(-1);
        const next = peekNextToken(chars, index + 1);
        const isUnion = Boolean(previous && canEndOperand(previous) && next && canStartOperand(next));
        tokens.push(operator(isUnion ? TOKEN.UNION : TOKEN.PLUS));
        break;
      }
      default:
        tokens.push(literal(char));
        break;
    }
  }

  return tokens;
}

function validateTokens(tokens) {
  let depth = 0;
  let expectOperand = true;

  for (const token of tokens) {
    switch (token.type) {
      case TOKEN.LEFT:
        depth += 1;
        break;
      case TOKEN.RIGHT:
        if (expectOperand) {
          throw new Error('Empty group or missing operand before ")"');
        }
        depth -= 1;
        if (depth < 0) {
          throw new Error('Mismatched parentheses');
        }
        expectOperand = false;
        break;
      case TOKEN.UNION:
      case TOKEN.CONCAT:
        if (expectOperand) {
          throw new Error(
            `Operator "${token.type === TOKEN.UNION ? '| or +' : 'concatenation'}" is missing its left operand`,
          );
        }
        expectOperand = true;
        break;
      case TOKEN.STAR:
      case TOKEN.PLUS:
      case TOKEN.QUESTION:
        if (expectOperand) {
          const symbol = token.type === TOKEN.STAR ? '*' : token.type === TOKEN.PLUS ? '+' : '?';
          throw new Error(`Operator "${symbol}" is missing its operand`);
        }
        expectOperand = false;
        break;
      case TOKEN.LITERAL:
        expectOperand = false;
        break;
      default:
        throw new Error(`Unsupported token type: ${token.type}`);
    }
  }

  if (depth !== 0) {
    throw new Error('Mismatched parentheses');
  }

  if (expectOperand) {
    throw new Error('Expression cannot end with an operator');
  }
}

export function insertConcat(tokens) {
  const out = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    out.push(token);

    if (index + 1 >= tokens.length) {
      continue;
    }

    if (canEndOperand(token) && canStartOperand(tokens[index + 1])) {
      out.push(operator(TOKEN.CONCAT));
    }
  }

  return out;
}

function isPostfix(token) {
  return token.type === TOKEN.STAR || token.type === TOKEN.PLUS || token.type === TOKEN.QUESTION;
}

export function toPostfix(tokens) {
  const output = [];
  const ops = [];

  for (const token of tokens) {
    if (token.type === TOKEN.LITERAL) {
      output.push(token);
      continue;
    }

    if (token.type === TOKEN.LEFT) {
      ops.push(token);
      continue;
    }

    if (token.type === TOKEN.RIGHT) {
      while (ops.length && ops.at(-1).type !== TOKEN.LEFT) {
        output.push(ops.pop());
      }
      if (!ops.length) {
        throw new Error('Mismatched parentheses');
      }
      ops.pop();
      continue;
    }

    if (isPostfix(token)) {
      while (ops.length && ops.at(-1).type !== TOKEN.LEFT && PREC[ops.at(-1).type] > PREC[token.type]) {
        output.push(ops.pop());
      }
      ops.push(token);
      continue;
    }

    while (
      ops.length &&
      ops.at(-1).type !== TOKEN.LEFT &&
      PREC[ops.at(-1).type] !== undefined &&
      PREC[ops.at(-1).type] >= PREC[token.type]
    ) {
      output.push(ops.pop());
    }
    ops.push(token);
  }

  while (ops.length) {
    const op = ops.pop();
    if (op.type === TOKEN.LEFT || op.type === TOKEN.RIGHT) {
      throw new Error('Mismatched parentheses');
    }
    output.push(op);
  }

  return output;
}

export function regexToPostfix(regex) {
  const source = regex ?? '';
  if (!source.trim()) {
    throw new Error('Empty regular expression');
  }

  const tokens = tokenize(source);
  if (!tokens.length) {
    throw new Error('Empty regular expression');
  }

  validateTokens(tokens);

  const postfix = toPostfix(insertConcat(tokens));
  if (!postfix.length) {
    throw new Error('Could not parse expression');
  }

  return postfix;
}
