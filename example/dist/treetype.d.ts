declare module "@api" {
    type Root = import("./index").ExampleApi;
    export const patcher: Root["patcher"], obj: Root["obj"], unload: Root["unload"];
}
declare module "@api/patcher" {
    type Root = import("./index").ExampleApi["patcher"];
    export const instead: Root["instead"], before: Root["before"], after: Root["after"];
}
declare module "@api/obj" {
    type Root = import("./index").ExampleApi["obj"];
    export const hello: Root["hello"], foo: Root["foo"], nested: Root["nested"];
}
declare module "@api/nested" {
    type Root = import("./index").NestedApi;
    export const hello: Root["hello"], log: Root["log"];
}
declare module "@api/nested/log" {
    type Root = import("./index").NestedApi["log"];
    export const log: Root["log"], error: Root["error"], warn: Root["warn"];
}
