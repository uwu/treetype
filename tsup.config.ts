import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/cli.ts"],
	format: ["esm", "cjs"],
	splitting: true,
	clean: true,
	dts: {
		entry: "src/index.ts",
	},
});
