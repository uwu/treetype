import * as spitroast from "spitroast";
declare const api: {
    patcher: Omit<typeof spitroast, "unpatchAll">;
    obj: {
        hello: string;
        foo: string;
        nested: {
            baz: string;
            num: number;
        };
    };
    unload: () => void;
};
declare const nested: {
    hello: string;
    log: {
        log: {
            (...data: any[]): void;
            (message?: any, ...optionalParams: any[]): void;
        };
        error: {
            (...data: any[]): void;
            (message?: any, ...optionalParams: any[]): void;
        };
        warn: {
            (...data: any[]): void;
            (message?: any, ...optionalParams: any[]): void;
        };
    };
};
export type ExampleApi = typeof api;
export type NestedApi = typeof nested;
export {};
