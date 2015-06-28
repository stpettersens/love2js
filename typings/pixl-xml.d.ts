// Type definitions for pixl-xml
// Project: https://github.com/jhuckaby/pixl-xml
// Definitions by: Sam Saint-Pettersen <https://github.com/stpettersens>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module "pixl-xml" {
	export function parse(xml_string: string, options?: Object): Object;
	export function stringify(xml: Object, root: string): string;
	export function encodeEntities(text: string): string;
	export function encodeAtribEntitites(text: string): string;
	export function decodeEntities(text: string): string;
	export function alwaysArray(maybe_array: any): any[];
	export function hashKeysToArray(hash: Object): any[]; 
	export function isaHash(maybe_hash: any): boolean;
	export function isaArray(maybe_array: any): boolean;
	export function numKeys(hash: Object): number;
	export function firstKey(hash: Object): string;
}
