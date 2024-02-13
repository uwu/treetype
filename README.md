# TreeType

TreeType generates module definitions for object types.

## Install
```sh
npm i tsup -D
# Or Yarn
yarn add tsup --dev
# Or pnpm
pnpm add tsup -D
```

## Usage
```
treetype <definition file>
```

The definition file specifies which modules to generate, the format is as follows:
```ini
## These directives control some global options
# `source` specifies which file should be used as the source of all source types
\source ./types.ts
# `import` specifies how `source` should be imported in the generated file
\import ./types

# All top-level modules must have a source type, this source type must be exported
# All properties on the source type are declared exports on the generated module
module from SourceType {
  # You may further specify a property inside a module to generate nested modules
  test
  hello {
    world
    foo
  }
  # You may override the source type for a portion of the module tree, this property should not exist on the parent source type
  bar from AnotherType
  baz from EvenMoreTypes {
    hello
    world
  }
}
```
Should any path or tree node need to contain whitespace, you can enclose it in quotes (`"`).

<!-- TODO: example plugins -->
