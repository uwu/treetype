import * as path from "node:path";
import ts from "typescript";
import type { DefinitionEntry } from "./def.js";

const factory = ts.factory;
const rootIdent = factory.createIdentifier("Root");

function createImportNode(def: DefinitionEntry) {
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

	return factory.createTypeAliasDeclaration(undefined, rootIdent, undefined, importNode);
}

const reserved = /* dprint-ignore */ [
	"break", "case", "catch", "class", "const", "continue", "debugger",
	"default", "delete", "do", "else", "enum", "export", "extends", "false",
	"finally", "for", "function", "if", "import", "in", "instanceof", "new",
	"null", "return", "super", "switch", "this", "throw", "true", "try",
	"typeof", "var", "void", "while", "with",
];

function createExportNode(checker: ts.TypeChecker, type: ts.Type) {
	const declarations: ts.VariableDeclaration[] = [];
	for (const prop of checker.getPropertiesOfType(type)) {
		if (reserved.includes(prop.name)) continue;
		declarations.push(
			factory.createVariableDeclaration(
				factory.createIdentifier(prop.name),
				undefined,
				factory.createIndexedAccessTypeNode(
					factory.createTypeReferenceNode(rootIdent),
					factory.createLiteralTypeNode(factory.createStringLiteral(prop.name)),
				),
			),
		);
	}

	return factory.createVariableStatement(
		[factory.createToken(ts.SyntaxKind.ExportKeyword)],
		factory.createVariableDeclarationList(declarations, ts.NodeFlags.Const),
	);
}

export function createModuleDeclarations(
	program: ts.Program,
	definitions: Iterable<DefinitionEntry>,
	resolveDir: string,
) {
	const checker = program.getTypeChecker();
	const nodes: ts.Node[] = [];

	for (const def of definitions) {
		const moduleName = factory.createStringLiteral(def.path.join("/"));

		const statements: ts.Statement[] = [];
		statements.push(createImportNode(def));
		{
			const sourcePath = path.resolve(resolveDir, def.source);
			const source = program.getSourceFile(sourcePath);
			if (!source) throw new Error(`source file "${sourcePath}" not found in project`);
			const symbol = checker.getSymbolAtLocation(source);
			if (!symbol) throw new Error("source file has no symbol associated with it");
			const exp = checker.getExportsOfModule(symbol).find((v) => v.escapedName === def.type);
			if (!exp) throw new Error(`could not find exported type "${def.type}" at module "${def.path.join("/")}"`);

			let type = checker.getDeclaredTypeOfSymbol(exp);
			for (const segment of def.resolve) {
				const sym = checker.getPropertyOfType(type, segment);
				if (!sym) throw new Error(`unknown property during traversal "${segment}" at module "${def.path.join("/")}"`);
				type = checker.getTypeOfSymbol(sym);
			}

			statements.push(createExportNode(checker, type));
		}

		const moduleNode = factory.createModuleDeclaration(
			[factory.createToken(ts.SyntaxKind.DeclareKeyword)],
			moduleName,
			factory.createModuleBlock(statements),
		);
		nodes.push(moduleNode);
	}

	return nodes;
}
