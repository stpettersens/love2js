// Type definitions for node-7z
// Project: https://github.com/quentinrossetti/node-7z
// Definitions by: Sam Saint-Pettersen <https://github.com/stpettersens>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module "node-7z" {
	export function add(archive: string, files: string[], opts?: Object);
	export function extract(archive: string, dest: string, opts?: Object);
	export function extractFull(archive: string, dest: string, opts?: Object);
	export function list(archive: string, opts?: Object);
	export function update(archive: string, files: string[], opts?: Object);
}
