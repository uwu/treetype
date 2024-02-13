import ts from "typescript";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { parseDefinition } from "./def.js";

const factory = ts.factory;

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
	}

	const file = path.resolve(argv[0]);
	const raw = await fs.readFile(file, "utf8");
	const definitions = parseDefinition(raw);

	const program = getProjectProgram(file);
	const checker = program.getTypeChecker();

	const nodes: ts.Node[] = [];
	for (const def of definitions) {
		const moduleName = factory.createStringLiteral(def.path.join("/"));
		const rootIdent = factory.createIdentifier("Root");

		const statements: ts.Statement[] = [];

		{
			let importNode: ts.TypeNode = factory.createImportTypeNode(
				factory.createLiteralTypeNode(factory.createStringLiteral(def.import)),
				undefined,
				factory.createIdentifier(def.type),
				undefined,
				false,
			);

			for (const segment of def.resolve) {
				importNode = factory.createIndexedAccessTypeNode(
					importNode,
					factory.createLiteralTypeNode(factory.createStringLiteral(segment)),
				);
			}

			statements.push(
				factory.createTypeAliasDeclaration(undefined, rootIdent, undefined, importNode)
			);
		}

		{
			const source = program.getSourceFile(path.resolve(path.dirname(file), def.source));
			if (!source) throw new Error("source file not found in project");
			const symbol = checker.getSymbolAtLocation(source);
			if (!symbol) throw new Error("source file has no symbol associated with it");
			const exp = checker.getExportsOfModule(symbol).find((v) => v.escapedName === def.type);
			if (!exp) throw new Error("could not find exported type");

			let type = checker.getDeclaredTypeOfSymbol(exp);
			for (const segment of def.resolve) {
				const sym = checker.getPropertyOfType(type, segment);
				if (!sym) throw new Error(`unknown property during traversal "${segment}"`);
				type = checker.getTypeOfSymbol(sym);
			}

			const ref: ts.TypeNode = factory.createTypeReferenceNode(rootIdent);
			const declarations: ts.VariableDeclaration[] = [];
			for (const prop of checker.getPropertiesOfType(type)) {
				// @ts-expect-error
				if (prop.name in ts.textToKeywordObj) continue;

				declarations.push(
					factory.createVariableDeclaration(
						factory.createIdentifier(prop.name),
						undefined,
						factory.createIndexedAccessTypeNode(
							ref,
							factory.createLiteralTypeNode(factory.createStringLiteral(prop.name)),
						),
					),
				);
			}

			statements.push(factory.createVariableStatement(
				[factory.createToken(ts.SyntaxKind.ExportKeyword)],
				factory.createVariableDeclarationList(declarations, ts.NodeFlags.Const),
			));
		}

		const moduleNode = factory.createModuleDeclaration(
			[factory.createToken(ts.SyntaxKind.DeclareKeyword)],
			moduleName,
			factory.createModuleBlock(statements),
		);
		nodes.push(moduleNode);
	}

	const result = ts.createSourceFile("output.ts", "", ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS);
	const printer = ts.createPrinter({
		newLine: ts.NewLineKind.LineFeed,
	});
	for (const node of nodes) {
		const str = printer.printNode(ts.EmitHint.Unspecified, node, result);
		console.log(str);
	}
}

await main(process.argv.slice(2));
