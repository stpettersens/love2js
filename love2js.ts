/*
	love2js
	Convert a Love2D game to a JavaScript-based HTML5 game.

	Copyright (c) 2015 Sam Saint-Pettersen.
	Released under the MIT/X11 License.

	Use -h switch for usage information.
*/

/// <reference path='node.d.ts' />
/// <reference path='luaparse.d.ts' />
/// <reference path='node-getopt.d.ts' />

import fs = require('fs');
import parser = require('luaparse');
import opt = require('node-getopt');

class Love2JS {
	private verbose: boolean;
	private version: string;
	private gulp: string[];
	private package: string[];
	private gfx_fns: string[];
	private graphics: string[];

	constructor(directory: string, lovefile: string, out: string, manifest: string, 
	generate: boolean, verbose: boolean, version: boolean, info: boolean) {

	}
}

var cli = opt.create([
	['h', 'help', 'display this help']
])
.bindHelp()
.parseSystem();

console.info(cli);


new Love2JS('dir', 'lovefile', 'out', 'manifest', false, false, false, false);
