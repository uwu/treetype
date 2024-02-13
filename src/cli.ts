#!/bin/env node
import ts from "typescript";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { parseDefinition } from "./def.js";
import { createModuleDeclarations } from "./core.js";

function getProjectProgram(filePath: string) {
	const configPath = ts.findConfigFile(filePath, ts.sys.fileExists, "tsconfig.json");
	if (!configPath) throw new Error("invalid project, no tsconfig.json was found");
	const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
	const { options, fileNames, errors } = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configPath));
	return ts.createProgram({
		options,
		rootNames: fileNames,
		configFileParsingDiagnostics: errors,
	});
}

async function main(argv: string[]) {
	if (argv.length < 1) {
		console.error("usage: treetype <definition file>");
		process.exit(1);
	}

	const file = path.resolve(argv[0]);
	let raw: string;
	try {
		raw = await fs.readFile(file, "utf8");
	} catch (e) {
		throw new Error(`failed to read definition file ${e instanceof Error ? e.message : e}`);
	}

	const program = getProjectProgram(file);
	const definitions = parseDefinition(raw);

	const nodes = createModuleDeclarations(program, definitions, path.dirname(file))
	const result = ts.createSourceFile("output.ts", "", ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS);
	const printer = ts.createPrinter({
		newLine: ts.NewLineKind.LineFeed,
	});
	for (const node of nodes) {
		const str = printer.printNode(ts.EmitHint.Unspecified, node, result);
		console.log(str);
	}
}

try {
	await main(process.argv.slice(2));
} catch (e) {
	console.error(`error: ${e instanceof Error ? e.message : e}`);
	process.exit(1);
}
