/*
	love2js
	Utility to convert a Love2D game to a JavaScript-based HTML5 game.

	Copyright (c) 2015 Sam Saint-Pettersen.
	Released under the MIT/X11 License.
*/

/// <reference path="typings/node.d.ts" />
/// <reference path="typings/node-getopt.d.ts" />

import Love2JS = require('./love2js');
import opt = require('node-getopt');

var cli = opt.create([
	['d', 'directory', 'Directory of source files to generate project from.'],
	['l', 'lovefile', 'LÖVE game file to generate project from.'],
	['o', 'out', 'Directory to generate project files to (default: \'html5\').'],
	['m', 'manifest', 'Manifest file to use to generate project.'],
	['g', 'generate', 'Generate manifest file for a project.'],
	['q', 'quiet', 'Run without any console output.'],
	['v', 'version', 'Display version information and exit.'],
	['h', 'help', 'Display this help and exit.']
])
.bindHelp();

var args: Object = cli.parseSystem();
var strargs: string[] = new Array<string>();
for(var key in args) {
	if(Array.isArray(args[key])) {
		for(var i: number = 0; i < args[key].length; i++) {
			strargs.push(args[key][i]);
		}
	}
}
new Love2JS(strargs[0], strargs[1], strargs[3], strargs[4], false, false, false);
