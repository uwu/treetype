enum TokenizerState {
	start,
	word,
	escaping,
	quote,
	comment,
}

function* tokenize(input: string) {
	let state = TokenizerState.start;
	let value = "";

	for (let i = 0; i < input.length; i++) {
		const char = input[i];

		switch (state) {
			case TokenizerState.start:
				switch (char) {
					case " ":
					case "\t":
					case "\r":
					case "\n":
						break;
					case '"':
						state = TokenizerState.quote;
						break;
					case "#":
						state = TokenizerState.comment;
						break;
					default:
						state = TokenizerState.word;
						value += char;
						break;
				}
				break;
			case TokenizerState.word:
				switch (char) {
					case " ":
					case "\t":
					case "\r":
					case "\n":
						if (value !== "") {
							yield value;
							state = TokenizerState.start;
							value = "";
						}
						break;
					case '"':
						state = TokenizerState.quote;
						break;
					default:
						value += char;
						break;
				}
				break;
			case TokenizerState.escaping:
				state = TokenizerState.quote;
				value += char;
				break;
			case TokenizerState.quote:
				switch (char) {
					case '"':
						state = TokenizerState.word;
						break;
					case "\\":
						state = TokenizerState.escaping;
						break;
					default:
						value += char;
						break;
				}
				break;
			case TokenizerState.comment:
				if (char === "\n") {
					state = TokenizerState.start;
				}
		}
	}

	if (value !== "") {
		yield value;
	}
}

export type DefinitionEntry = {
	path: string[];
	resolve: string[];
	type: string;
	source: string;
	import: string;
};

export function* parseDefinition(source: string) {
	const tokens = [...tokenize(source)];
	let pos = 0;

	let currentSource: string | undefined;
	let currentImport: string | undefined;

	function ensureNotEof() {
		if (pos > tokens.length) throw new Error("unexpected EOF");
	}
	const peek = () => tokens[pos] ?? null;
	const read = () => tokens[pos++] ?? null;
	const match = (token: string) => peek() === token;
	function expect(expected: string) {
		const got = read();
		if (got !== expected) throw new Error(`expected "${expected}", got "${got}"`);
		return got;
	}

	function* parseNode(
		path: string[] = [],
		resolve: string[] = [],
		from: string | null = null
	): Generator<DefinitionEntry> {
		ensureNotEof();
		const name = read();

		path = [...path, name];
		resolve = [...resolve, name];

		if (match("from")) {
			expect("from");
			from = read();
			resolve.shift();
		}

		if (!from) throw new Error(`expected source type definition on root node "${name}"`);
		if (!currentSource) throw new Error(`expected source file to be set before root node`);
		if (!currentImport) throw new Error(`expected source import to be set before root node`);

		yield {
			path,
			resolve,
			type: from,
			source: currentSource,
			import: currentImport,
		};

		if (match("{")) {
			expect("{");
			loop: while (true) {
				ensureNotEof();
				const token = peek();
				switch (token) {
					case "{":
						throw new Error(`unexpected "${token}"`);
					case "}":
						break loop;
					default:
						yield* parseNode(path, resolve, from);
				}
			}
			expect("}");
		}
	}

	loop: while (true) {
		const token = peek();
		switch (token) {
			case "{":
			case "}":
				throw new Error(`unexpected "${token}"`);
			case "\\source":
				read();
				currentSource = read();
				break;
			case "\\import":
				read();
				currentImport = read();
				break;
			case null:
				break loop;
			default:
				yield* parseNode();
		}
	}
}
