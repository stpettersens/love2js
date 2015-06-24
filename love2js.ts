/*
	love2js
	Utility to convert a Love2D game to a JavaScript-based HTML5 game.

	Copyright (c) 2015 Sam Saint-Pettersen.
	Released under the MIT/X11 License.
*/

/// <reference path='node.d.ts' />
/// <reference path='luaparse.d.ts' />

import fs = require('fs');
import lua = require('luaparse');

class Love2JS {
	private quiet: boolean;
	private version: string;
	private gulp: string[];
	private package: string[];
	private gfx_fns: string[];
	private graphics: string[];

	constructor(directory: string, lovefile: string, out: string, manifest: string, 
	generate: boolean, quiet: boolean, version: boolean) {

	}
}

export = Love2JS;
