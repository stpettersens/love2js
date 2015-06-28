// Type definitions for prompt
// Project: https://github.com/flatiron/prompt
// Definitions by: Sam Saint-Pettersen <https://github.com/stpettersens>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

/// <require path="node.d.ts" />

declare module "prompt" {
	export function start(): void;
	export function get(variables: string[], callback: any): void;
}
