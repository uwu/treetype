import * as spitroast from "spitroast";

function without<O, const K extends keyof O>(obj: O, ...keys: K[]) {
	const clone = Object.assign({}, obj);
	for (const key of keys) delete clone[key];
	return clone as Omit<O, K>;
}

const api = {
	patcher: without(spitroast, "unpatchAll"),
	obj: {
		hello: "world",
		foo: "bar",
		nested: {
			baz: "qux",
			num: 123,
		},
	},
	unload: () => spitroast.unpatchAll(),
};

export type ExampleApi = typeof api;
