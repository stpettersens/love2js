/*
	Lua to JavaScript conversion utility.
*/

/// <reference path='node.d.ts' />
/// <reference path='luaparse.d.ts' />
/// <reference path='LuaASTParser.ts' />

import LuaASTParser = require('./LuaASTParser');
import fs = require('fs');
import lua = require('luaparse');

class JSProcessor {

	public processJS(js: string[]): string[] {
		var pjs = new Array<string>();
		for(var i: number = 0; i < js.length; i++) {
			var n: string = js[i].replace(/sizeof:([a-z0-9\_\.]+)/ig, '$1.length ');
			n = n.replace(/require\s.*/ig, '');
			n = n.replace(/print(\(.*\))/ig, 'console.log$1');
			n = n.replace(/string\.format(\(.*\))/ig, 'sprintf$1');
			n = n.replace(/console.log\(sprintf(\(.*\))\)/ig, 'console.log$1')
			n = n.replace(/\t/ig, '    ');
			pjs.push(n);
		}
		return pjs;
	}

	public printJS(js: string[]): void {
		console.log('\nOutput JS:\n');
		for(var i: number = 0; i < js.length; i++) {
			console.log(js[i]);
		}
	}

	public writeJS(js: string[], file: string): void {
		var outjs: string = js.join('\n');
		fs.writeFile(file, outjs, 'utf8', function(err: any) {
			if(err) throw err;
			console.log('\nWrote %s', file);
		});
	}
}

class Lua2JS {
	private js: string[];

	constructor(lua_file: string, js_file: string) {
		console.log('Converting %s to JavaScript...', lua_file);
		var out: string[] = lua_file.split('.');
		if(js_file == null) js_file = out[0] + '.js';
		fs.readFile(lua_file, 'utf8', function(err: any, lua_code: string) {
			var ast: Object = lua.parse(lua_code, {comments: false});
			var parser = new LuaASTParser(true);
			this.js = parser.parse(ast);
			var processor = new JSProcessor();
			this.js = processor.processJS(this.js);
			processor.printJS(this.js);
			processor.writeJS(this.js, js_file);
		});
	}
}

new Lua2JS(process.argv[2], process.argv[3]);
