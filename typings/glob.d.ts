// Type definitions for glob
// Project: https://github.com/isaacs/node-glob
// Definitions by: Sam Saint-Pettersen <https://github.com/stpettersens>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module "glob" {
	export function glob(pattern: string, options?: Object): any;
	export function sync(pattern: string, options?: Object): string[];
	export function hasMagic(pattern: string, options?: Object): boolean;
}
