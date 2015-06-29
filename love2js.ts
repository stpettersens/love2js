/*
	love2js
	Utility to convert a Love2D game to a JavaScript-based HTML5 game.

	Copyright (c) 2015 Sam Saint-Pettersen.
	Released under the MIT/X11 License.
*/

/// <reference path="typings/node.d.ts" />
/// <reference path="typings/luaparse.d.ts" />
/// <reference path="typings/prompt.d.ts" />
/// <reference path="typings/unzip.d.ts" />
/// <reference path="typings/node-7z.d.ts" />
/// <reference path="typings/xml.d.ts" />
/// <reference path="typings/pixl-xml.d.ts" />
/// <reference path="typings/sprintf-js.d.ts" />
/// <reference path="typings/magic-number.d.ts" />
/// <reference path="typings/glob.d.ts" />

import fs = require('fs');
import lua = require('luaparse');
import prompt = require('prompt');
import unzip = require('unzip');
import z7 = require('node-7z');
import xml = require('xml');
import pixl = require('pixl-xml');
import sprintfjs = require('sprintf-js');
import magic = require('magic-number');
import glob = require('glob');

class Love2JS {

	private verbose: boolean;
	private version: string;
	private package: string[];
	private gfx_fns: string[];
	private graphics: string[];
	private js: string[];
	private use_archive: boolean;
	private use_graphics: boolean;

	constructor(directory: string, lovefile: string, out: string, manifest: string,
	generate: boolean, verbose: boolean, version: boolean) {
		this.version = 'love2js v1.0.0';
		this.verbose = true;
		this.use_archive = false;
		this.use_graphics = false;

		this.package = new Array<string>();
		this.gfx_fns = new Array<string>();
		this.graphics = new Array<string>();
		this.js = new Array<string>();

		if(version) {
			console.log(this.version);
		}
		else if(generate) {
			this.generateManifest();
		}
		else {
			if(verbose) this.verbose = true; // Set to be verbose.
			//if(manifest == '')
			manifest = 'manifest.xml'; // Default file is manifest.xml
			if(out == '') out = 'html5';
			this.loadManifest(manifest);

			//if(lovefile != '') {
			lovefile = 'blackjack-windeck.love'; // !!!
			this.extractLOVEArchive(lovefile);
			//}
			this.copyJSLibs(out);
			this.generateGraphics(out);
			this.generateJS();
			this.generatePackage();
			this.generateGulpfile();
		}
	}

	// Generate a manifest.
	private generateManifest(): void {
		prompt.start();
		prompt.get(['name', 'version', 'description', 'author', 'email', 'license', 'homepage', 'file'], function(err: any, res: any) {
			var manifest: Object = {
				manifest: [
					{ 'name': res.name },
					{ 'version': res.version },
					{ 'description': res.description },
					{ 'author': res.author },
					{ 'email': res.email },
					{ 'license': res.license },
					{ 'homepage': res.homepage },
					{ 'file': res.file }
				]
			};
			var data: string = xml(manifest, {declaration: true, indent: '\t'});
			fs.writeFile('manifest.xml', data, function(err) {
				if(err) throw err;
				_print(this.verbose, 'Generated manifest file.');
			});
		});
	}

	// Load a manifest.
	private loadManifest(manifest: string): void {
		_print(this.verbose, 'Loading manifest...');
		if(fs.existsSync('manifest.xml')) {
			var data: any = fs.readFileSync('manifest.xml');
			var tree: any = pixl.parse(data);
			this.package.push(tree.name);
			this.package.push(tree.version);
			this.package.push(tree.description);
			this.package.push(sprintfjs.sprintf('%s <%s>',
			tree.author, tree.email));
			this.package.push(tree.license);
			this.package.push(tree.homepage);
			this.package.push(tree.file);
		}
		else {
			console.log('Manifest file required (%s). Not found.\nTerminating.', manifest);
			process.exit(1);
		}
	}

	// Extract the contents of a LOVE game (archive) file.
	private extractLOVEArchive(love_game: string): void {
		this.use_archive = true;
		if(magic.detectFile(love_game) == 'application/zip') {
			_print(this.verbose, 'Extracting LOVE game (ZIP)...');
			fs.createReadStream(love_game)
			.pipe(unzip.Extract({path:'.'}));
		}
		else if(magic.detectFile(love_game) == 'application/x-7z-compressed') {
			_print(this.verbose, 'Extracting LOVE game (7z)...');
			var z7a: any = new z7();
			z7a.extractFull(love_game, '.');
		}
		else {
			console.log('Error: Unsupported archive type.');
			process.exit(1);
		}
	}

	// Generate package.json file for npm.
	private generatePackage(): void {
		_print(this.verbose, 'Generating package.json...');
		var data: string = JSON.stringify(
			{
				'name'	  	  : this.package[0],
				'version'	  	: this.package[1],
				'description' : this.package[2],
				'author'	  	: this.package[3],
				'license'	  	: this.package[4],
				'homepage'	  : this.package[5],
				'scripts' : {
					'dist'  : 'gulp',
					'clean' : 'gulp clean'
				},
				'preferGlobal' : false,
				'dependencies' : {
					'gulp' 		  	: '~3.9.0',
					'gulp-concat' : '~2.5.2',
					'gulp-rename' : '~1.2.2',
					'gulp-insert' : '~0.4.0',
					'gulp-uglify' : '~1.2.0'
				}
 			},
		null, 4);
		data += '\n';
		fs.writeFileSync('dpackage.json', data);
	}

	// Copy each JavaScript library in /libs directory to build.
	private copyJSLibs(directory: string): void {
		_print(this.verbose, 'Copying libraries...');
		if(!fs.existsSync('html5')) {
			fs.mkdirSync('html5');
		}
		var libs: string[] = glob.sync('libs/*.js');
		for(var i: number = 0; i < libs.length; i++) {
			this.js.push(sprintfjs.sprintf('\'%s\'', libs[i]));
			fs.createReadStream(libs[i])
			.pipe(fs.createWriteStream('html5/sprintf.min.js'));
		}
	}

	// Generate graphics (data URIs and graphics.js file).
	private generateGraphics(directory: string): void {
		_print(this.verbose, 'Generating graphics and graphics.js...');
		var graphics: string[] = glob.sync('gfx/*.png');
		for(var i: number = 0; graphics.length; i++) {
			this.use_graphics = true;
			if(graphics[i] == undefined) break;
			var data: any = fs.readFileSync(graphics[i]);
			var encoded: string = new Buffer(data).toString('base64');
			this.gfx_fns.push(graphics[i].replace('\\', '/'));
			this.graphics.push('data:image/png;base64,' + encoded);
		}

		if(this.use_graphics) {
			this.js.push('\'graphics.js\'');
			var data: any = '/* Graphics for generated game. */';
			data += '\nvar gfx_fns = [\n';
			for(var i: number = 0; i < this.gfx_fns.length; i++) {
				if(i == this.gfx_fns.length - 1) {
					data += sprintfjs.sprintf('\'%s\'\n];\n', this.gfx_fns[i]);
				}
				else data += sprintfjs.sprintf('\'%s\',\n', this.gfx_fns[i]);
			}
			data += '\nvar graphics = [\n';
			for(var i: number = 0; i < this.graphics.length; i++) {
				var graphic: string = this.graphics[i].replace(/\n/g, '');
				var y: number = 0;
				var x: number = 1;
				var newGraphic: string  = '';
				while(y < graphic.length) {
					if(x == 81) {
						newGraphic += graphic[y] + '\'+\n\'';
						x = 1;
					}
					else newGraphic += graphic[y];
					x++;
					y++;
				}
				if(i == this.graphics.length - 1)
				 	data += sprintfjs.sprintf('\'%s\'\n];\n', newGraphic);
				else
					data += sprintfjs.sprintf('\'%s\',\n', newGraphic);
			}
			fs.writeFileSync('graphics.js', data);
		}
	}

	// Port each Love2d Lua file to JavaScript.
	private generateJS(): void {
		_print(this.verbose, 'Generating game scripts...');
		// TODO
	}

	// Generate Gulpfile for Gulp.js
	private generateGulpfile(): void {
		_print(this.verbose, 'Generating Gulpfile.js...');
		var year: number = new Date().getFullYear();
		var copyright: string = sprintfjs.sprintf('Copyright %d %s',
		year, this.package[3]);
		var license: string = sprintfjs.sprintf('\\nReleased under the %s License.',
		this.package[4]);
		var uses: string = 'Uses sprintf-js | Alexandru Marasteanu <hello@alexei.ro> (http://alexei.ro/) | BSD-3-Clause';
		var data: string = '/*\nGulpfile to generate minified JavaScript file for game from sources.\n*/\n';
		data += 'var gulp = require(\'gulp\'),\n';
		data += '\t\t\tfs = require(\'fs\'),\n';
		data += '\tconcat = require(\'gulp-concat\'),\n';
		data += '\trename = require(\'gulp-rename\'),\n';
		data += '\tinsert = require(\'gulp-insert\'),\n';
		data += '\tuglify = require(\'gulp-uglify\'),\n\n';
		data += 'gulp.task(\'js\', function() {\n';
		data += sprintfjs.sprintf('\treturn gulp.src([%s])\n', this.js);
		data += sprintfjs.sprintf('\t.pipe(concat(\'%s.js\'))\n',
		this.package[6]);
		data += '\t.pipe(gulp.dest(\'dist\'))\n';
		data += sprintfjs.sprintf('\t.pipe(rename(\'%s.min.js\'))\n',
		this.package[6]);
		data += '\t.pipe(uglify())\n';
		data += sprintfjs.sprintf('\t.pipe(insert.prepend(\'/*\\n%s\\n\'+\n', this.package[0]);
		data += sprintfjs.sprintf('\t\'%s\'+\n\t\'%s\\n%s\\n\\n\'+\n\t\'%s\\n*/\\n\'))\n', copyright, license, this.package[5], uses);
		data += '\t.pipe(gulp.dest(\'dist\'));';
		data += '\n};\n\n';
		data += 'gulp.task(\'html\', function() {\n';
		data += '\tvar html=\'<!DOCTYPE html>\\n<head>\'+\n';
		data += sprintfjs.sprintf('\t\'\\n<title>%s</title>\\n\'+\n', this.package[0]);
		data += sprintfjs.sprintf('\t\'<script type="text/javascript" src="%s.min.js"></script>\\n\'+\n', this.package[6]);
		data += sprintfjs.sprintf('\t\'</head>\\n<body>\\n<h3 id="game-title" style="text-align: center;">%s</h3>\\n\'+\n', this.package[0]);
		data += '\t\'<canvas id="game"></canvas>\\n</body>\\n</html>\\n\';\n';
		data += '\tfs.writeFileSync(\'index.html\', html);\n';
		data += '\treturn gulp.src(\'index.html\')\n';
		data += '\t.pipe(gulp.dest(\'dist\'));';
		data += '\n});\n\n';
		data += 'gulp.task(\'clean\', function() {\n';
		data += sprintfjs.sprintf('\tfs.unlinkSync(\'dist/%s.min.js\');\n', this.package[6]);
		data += sprintfjs.sprintf('\tfs.unlinkSync(\'dist/%s.js\');\n', this.package[6]);
		data += '\tfs.unlinkSync(\'index.html\');\n';
		data += '\tfs.rmdir(\'dist\');';
		data += '\n});\n\n';
		data += 'gulp.task(\'default\', [\'js\',\'html\'], function(){});\n';
		fs.writeFileSync('dGulpfile.js', data);
	}
}

// Print as applicable.
function _print(verbose: boolean, message: any): void {
	if(verbose) console.log(message);
}

export = Love2JS;
