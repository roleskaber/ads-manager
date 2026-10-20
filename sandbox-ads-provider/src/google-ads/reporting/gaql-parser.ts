import { InvalidArgumentError } from "../../domain/errors.js";

export type Literal = string | number | boolean | null;

export type Condition =
  | { field: string; op: "=" | "!=" | ">" | ">=" | "<" | "<=" | "LIKE" | "NOT LIKE"; value: Literal }
  | { field: string; op: "IN" | "NOT IN"; values: Literal[] }
  | { field: string; op: "BETWEEN"; from: Literal; to: Literal }
  | { field: string; op: "DURING"; range: string }
  | { field: string; op: "IS NULL" | "IS NOT NULL" };

export type GaqlQuery = {
  select: string[];
  from: string;
  where: Condition[];
  orderBy: { field: string; direction: "ASC" | "DESC" }[];
  limit: number | null;
};

type Token = { type: "word" | "string" | "number" | "symbol"; value: string };

const queryError = (message: string) => new InvalidArgumentError(message, { queryError: "UNEXPECTED_INPUT" });

function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /\s*(?:(-?\d+(?:\.\d+)?)|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|([A-Za-z_][A-Za-z0-9_.]*)|(!=|>=|<=|[=<>(),]))/y;
  let index = 0;
  while (index < query.length) {
    if (/^\s*$/.test(query.slice(index))) break;
    pattern.lastIndex = index;
    const match = pattern.exec(query);
    if (!match) throw queryError(`Unexpected input at position ${index}: ${query.slice(index, index + 20)}`);
    index = pattern.lastIndex;
    if (match[1] !== undefined) tokens.push({ type: "number", value: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: "string", value: match[2].replace(/\\(.)/g, "$1") });
    else if (match[3] !== undefined) tokens.push({ type: "string", value: match[3].replace(/\\(.)/g, "$1") });
    else if (match[4] !== undefined) tokens.push({ type: "word", value: match[4] });
    else tokens.push({ type: "symbol", value: match[5]! });
  }
  return tokens;
}

/**
 * Parses the Google Ads Query Language subset the sandbox supports:
 * SELECT f1, f2 FROM resource [WHERE cond [AND cond]...] [ORDER BY f [ASC|DESC], ...] [LIMIT n]
 */
export function parseGaql(query: string): GaqlQuery {
  const tokens = tokenize(query);
  let position = 0;

  const peek = () => tokens[position];
  const isKeyword = (word: string, offset = 0) => tokens[position + offset]?.type === "word" && tokens[position + offset]!.value.toUpperCase() === word;
  const next = () => {
    const token = tokens[position++];
    if (!token) throw queryError("Unexpected end of query");
    return token;
  };
  const expectKeyword = (word: string) => {
    if (!isKeyword(word)) throw queryError(`Expected ${word} but found ${peek()?.value ?? "end of query"}`);
    position++;
  };
  const expectSymbol = (symbol: string) => {
    const token = next();
    if (token.type !== "symbol" || token.value !== symbol) throw queryError(`Expected "${symbol}" but found ${token.value}`);
  };
  const field = () => {
    const token = next();
    if (token.type !== "word") throw queryError(`Expected a field name but found ${token.value}`);
    return token.value.toLowerCase();
  };
  const literal = (): Literal => {
    const token = next();
    if (token.type === "string") return token.value;
    if (token.type === "number") return Number(token.value);
    if (token.type === "word") {
      const upper = token.value.toUpperCase();
      if (upper === "TRUE") return true;
      if (upper === "FALSE") return false;
      if (upper === "NULL") return null;
      return token.value; // enum values are written bare: status = ENABLED
    }
    throw queryError(`Expected a value but found ${token.value}`);
  };

  expectKeyword("SELECT");
  const select = [field()];
  while (peek()?.value === ",") {
    position++;
    select.push(field());
  }

  expectKeyword("FROM");
  const from = field();

  const where: Condition[] = [];
  if (isKeyword("WHERE")) {
    position++;
    do {
      where.push(condition());
    } while (isKeyword("AND") && ++position);
  }

  const orderBy: GaqlQuery["orderBy"] = [];
  if (isKeyword("ORDER")) {
    position++;
    expectKeyword("BY");
    do {
      const name = field();
      let direction: "ASC" | "DESC" = "ASC";
      if (isKeyword("ASC") || isKeyword("DESC")) direction = next().value.toUpperCase() as "ASC" | "DESC";
      orderBy.push({ field: name, direction });
    } while (peek()?.value === "," && ++position);
  }

  let limit: number | null = null;
  if (isKeyword("LIMIT")) {
    position++;
    const token = next();
    if (token.type !== "number" || !Number.isInteger(Number(token.value)) || Number(token.value) <= 0) {
      throw queryError("LIMIT must be a positive integer");
    }
    limit = Number(token.value);
  }

  if (position < tokens.length) throw queryError(`Unexpected input: ${tokens[position]!.value}`);
  return { select, from, where, orderBy, limit };

  function condition(): Condition {
    const name = field();
    if (isKeyword("IN")) {
      position++;
      return { field: name, op: "IN", values: list() };
    }
    if (isKeyword("NOT") && isKeyword("IN", 1)) {
      position += 2;
      return { field: name, op: "NOT IN", values: list() };
    }
    if (isKeyword("NOT") && isKeyword("LIKE", 1)) {
      position += 2;
      return { field: name, op: "NOT LIKE", value: literal() };
    }
    if (isKeyword("LIKE")) {
      position++;
      return { field: name, op: "LIKE", value: literal() };
    }
    if (isKeyword("BETWEEN")) {
      position++;
      const from = literal();
      expectKeyword("AND");
      return { field: name, op: "BETWEEN", from, to: literal() };
    }
    if (isKeyword("DURING")) {
      position++;
      return { field: name, op: "DURING", range: next().value.toUpperCase() };
    }
    if (isKeyword("IS")) {
      position++;
      if (isKeyword("NOT")) {
        position++;
        expectKeyword("NULL");
        return { field: name, op: "IS NOT NULL" };
      }
      expectKeyword("NULL");
      return { field: name, op: "IS NULL" };
    }
    const op = next();
    if (op.type !== "symbol" || !["=", "!=", ">", ">=", "<", "<="].includes(op.value)) {
      throw queryError(`Unsupported operator ${op.value}`);
    }
    return { field: name, op: op.value as "=", value: literal() };
  }

  function list(): Literal[] {
    expectSymbol("(");
    const values = [literal()];
    while (peek()?.value === ",") {
      position++;
      values.push(literal());
    }
    expectSymbol(")");
    return values;
  }
}
