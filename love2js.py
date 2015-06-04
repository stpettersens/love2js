#!/usr/bin/env python
"""
love2js
Convert a Love2D game to a JavaScript-based HTML5 game.

Copyright (c) 2015 Sam Saint-Pettersen.
Released under the MIT/X11 License.

Use -h switch for usage information.
"""
import sys
import os
import re
import glob
import json
import codecs
import argparse
from datetime import datetime
import xml.dom.minidom as xml
import xml.etree.ElementTree as ET

class love2js:

	verbose = True # Verbose by default.
	version = 'love2js v1.0' # Version string.

	gulp = [ 
	'gulp:~3.9.0', 
	'gulp-concat:~2.5.2', 
	'gulp-rename:~1.2.2', 
	'gulp-insert:~0.4.0', 
	'gulp-uglify:~1.2.0'
	]

	package  = []
	gfx_fns  = []
	graphics = []
	lua 	 = []
	js 		 = []

	map_lua  = []
	map_js   = [] 

	def __init__(self, directory, out, manifest, generate, verbose, version, info):
		if len(sys.argv) == 1 or info:
			print(__doc__) # Display program information.
		elif version:
			print(love2js.version) # Print version string.
		elif generate:
			self.generateManifest(generate)
		else:
			if verbose: love2js.verbose = True # Set to be verbose.
			if manifest == None: manifest = 'manifest.xml' # Default file is manifest.xml
			if out == None: out = 'html5'
			self.loadManifest(manifest)
			self.loadConversionMap()
			self.generateGraphics(out)
			self.generateJS()
			self.generatePackage()
			self.generateGulpfile()

	# Generate a manifest.
	def generateManifest(self, mout):
		name = raw_input('Name: ')
		version = raw_input('Version: ')
		desc = raw_input('Description: ')
		author = raw_input('Author: ')
		email = raw_input('E-mail: ')
		license = raw_input('License: ')
		homepage = raw_input('Home page: ')

		xmlns = 'xmlns="https://stpettersens.github.io/love2js/manifest/1.0">'
		manifest = xml.Document()
		mf = manifest.createElement('manifest')
		manifest.appendChild(mf)
		n = manifest.createElement('name')
		mf.appendChild(n)
		n_is = manifest.createTextNode(name)
		n.appendChild(n_is)
		v = manifest.createElement('version')
		mf.appendChild(v)
		v_is = manifest.createTextNode(version)
		v.appendChild(v_is)
		d = manifest.createElement('description')
		mf.appendChild(d)
		d_is = manifest.createTextNode(desc)
		d.appendChild(d_is)
		a = manifest.createElement('author')
		mf.appendChild(a)
		a_is = manifest.createTextNode(author)
		a.appendChild(a_is)
		e = manifest.createElement('email')
		mf.appendChild(e)
		e_is = manifest.createTextNode(email)
		e.appendChild(e_is)
		l = manifest.createElement('license')
		mf.appendChild(l)
		l_is = manifest.createTextNode(license)
		l.appendChild(l_is)
		h = manifest.createElement('homepage')
		mf.appendChild(h)
		h_is = manifest.createTextNode(homepage)
		h.appendChild(h_is)
		ff = manifest.createElement('file')
		mf.appendChild(ff)
		ff_is = manifest.createTextNode(homepage)
		h.appendChild(ff_is)

		f = codecs.open(mout, 'w', 'utf-8')
		f.write(manifest.toprettyxml(encoding='utf-8'))
		f.close()

		f = codecs.open(mout, 'r', 'utf-8')
		lines = f.readlines()
		lines[1] = re.sub('\<manifest\>', '<manifest ' + xmlns, lines[1])

		f = codecs.open(mout, 'w', 'utf-8')
		for line in lines:
			f.write(line)
		f.write('\n')
		f.close()

		_print('Generated manifest file: {0}'.format(mout))

	# Load a manifest.
	def loadManifest(self, manifest):
		if os.path.isfile(manifest):
			tree = ET.parse(manifest)
			root = tree.getroot()
			for child in root:
				love2js.package.append(child.text)

			love2js.package[3] += ' <{0}>'.format(love2js.package[4])
			del love2js.package[4]

		else:
			print('Manifest file required ({0}). Not found.\nTerminating.'.format(manifest))
			sys.exit(1)

	# Load conversion  map file which maps Love2d Lua statements to equivalent JavaScript.
	def loadConversionMap(self, map_file='conversion.xml'):
		if os.path.isfile(map_file):
			tree = ET.parse(map_file)
			root = tree.getroot()
			for child in root.findall('statement'):
				love2js.map_lua.append(child.find('lua').text)
				love2js.map_js.append(child.find('js').text)
		else:
			print('Coversion map file required ({0}). Not found.\nTerminating.'.format(map_file))
			sys.exit(1)

	# Generate packages.json file for npm.
	def generatePackage(self):
		gulp = love2js.gulp[0].split(':')
		concat = love2js.gulp[1].split(':')
		rename = love2js.gulp[2].split(':')
		insert = love2js.gulp[3].split(':')
		uglify = love2js.gulp[4].split(':')
		data = json.dumps(
			{
				'name'			: 	love2js.package[0],
				'version'		:  	love2js.package[1],
				'description'	: 	love2js.package[2],
				'author'		: 	love2js.package[3],
				'license'		: 	love2js.package[4],
				'homepage'		: 	love2js.package[5],
				'scripts': {
					'dist'	: 'gulp',
					'clean'	: 'gulp clean'
				},
				'preferGlobal': False,
				'dependencies': {	
					  gulp[0] :   gulp[1],
					concat[0] : concat[1],
					rename[0] : rename[1],
					insert[0] : insert[1],
					uglify[0] : uglify[1]
				}
			}
		, indent=4, separators=(',', ': '))
		
		f = codecs.open('html5/package.json', 'w', 'utf-8')
		f.write(data + '\n')
		f.close()

	# Generate graphics (data URIs and graphics.js file).
	def generateGraphics(self, directory):
		use_graphics = False
		if not os.path.exists(directory):
			os.mkdir(directory)

		for graphic in glob.glob('gfx/*.png'):
			use_graphics = True
			encoded = open(graphic, 'rb').read().encode('base64')
			love2js.gfx_fns.append(re.sub('\\\\', '/', graphic))
			love2js.graphics.append('data:image/png;base64,' + encoded)

		for graphic in glob.glob('gfx/*.svg'):
			use_graphics = True
			encoded = open(graphic, 'rb').read().encode('base64')
			love2js.gfx_fns.append(re.sub('\\\\', '/', graphic))
			love2js.graphics.append('data:image/svg+xml;base64,' + encoded)

		if use_graphics:
			love2js.js.append('graphics.js')
			f = codecs.open(directory + '/graphics.js', 'w', 'utf-8')
			f.write('/* Graphics for generated game. */')
			f.write('\nvar gfx_fns = [\n')
			i = 1
			for fn in love2js.gfx_fns:
				if i == len(love2js.gfx_fns):
					f.write('\'{0}\'\n];\n'.format(fn))
				else:
					f.write('\'{0}\',\n'.format(fn))
				i = i + 1

			f.write('\nvar graphics = [\n')
			i = 1
			for graphic in love2js.graphics:
				graphic = re.sub('\n', '', graphic)
				y = 0
				x = 1
				newGraphic = ''
				while y < len(graphic):
					if x == 81:
						newGraphic = newGraphic + graphic[y] + '\'+\n\''
						x = 1
					else:
						newGraphic = newGraphic + graphic[y]
					x = x + 1
					y = y + 1

				if i == len(love2js.graphics):
					f.write('\'{0}\'\n];\n'.format(newGraphic))
				else:
					f.write('\'{0}\',\n'.format(newGraphic))
				i = i + 1

			f.close()

	# Port each file JavaScript file from each Love2d Lua file.
	def generateJS(self):
		for lua in glob.glob('*.lua'):
			f = codecs.open(lua, 'r', 'utf-8')
			love2js.lua = f.readlines()
			f.close()

			js = []
			for line in love2js.lua:
				i = 0
				while i < len(love2js.map_lua):
					line = re.sub(love2js.map_lua[i], love2js.map_js[i], line)
					i = i + 1

				js.append(line)

			jsf = lua.split('.')
			love2js.js.append(jsf[0] + '.js')
			f = codecs.open('html5/' + jsf[0] + '.js', 'w', 'utf-8')
			f.write(js[0])
			f.write('\nwindow.onload = function() {\n')
			f.write('\nvar canvas = document.getElementById(\'game\');\n')
			f.write('canvas.style.marginLeft = \'auto\';\n')
			f.write('canvas.style.marginRight = \'auto\';\n')
			f.write('canvas.style.display = \'block\';\n')
			f.write('canvas.style.border = \'1px dotted #000000\';\n')
			
			for line in js[1:]:
				f.write(line)

			f.write('\nfunction canvas_setMode(width, height) {\n')
			f.write('\tcanvas.width = width.toString();\n\tcanvas.height = height.toString();\n}\n')

			f.write('\nfunction canvas_setBackgroundColor(r, g, b) {\n')
			f.write('\tcanvas.style.backgroundColor = \'rgb(\'+r+\',\'+g+\',\'+b+\')\';\n}\n')

			f.write('\nfunction canvas_print(message, x, y) {\n')
			f.write('\tvar context = canvas.getContext(\'2d\');\n')
			f.write('\tcontext.font = \'10pt Verdana\';\n')
			f.write('\tcontext.fillStyle = \'white\';\n')
			f.write('\tcontext.fillText(message, x, y);\n')
			f.write('}\n')

			f.write('\nfunction canvas_getGraphic(graphic) {\n')
			f.write('\treturn graphics[gfx_fns.indexOf(graphic)];\n}\n')

			f.write('\nfunction canvas_drawGraphic(graphic, x, y) {\n')
			f.write('\tvar context = canvas.getContext(\'2d\');\n')
			f.write('\tvar g = new Image();\n\tg.src = graphic;\n')
			f.write('\tcontext.drawImage(g, x, y, 71, 96);\n}\n')
			f.write('\nlove_load();\nlove_draw();\n}\n')
			f.close()

	# Generate Gulpfile for Gulp.js
	def generateGulpfile(self):
		dt = str(datetime.now())
		m = re.match('(\d{4})', dt)
		year = str(m.group(0))
		copyright = 'Copyright {0} {1}'.format(year, love2js.package[3])
		license = '\\nReleased under the {0} License.'.format(love2js.package[4])

		f = codecs.open('html5/Gulpfile.js', 'w', 'utf-8')
		f.write('/*\n\tGulpfile to generate minified JavaScript file for game from sources.\n*/\n')
		f.write('var gulp = require(\'gulp\'),\n')
		f.write('\t\tfs = require(\'fs\'),\n')
		f.write('\tconcat = require(\'gulp-concat\'),\n')
		f.write('\trename = require(\'gulp-rename\'),\n')
		f.write('\tinsert = require(\'gulp-insert\'),\n')
		f.write('\tuglify = require(\'gulp-uglify\');\n\n')
		f.write('gulp.task(\'js\', function() {\n')
		f.write('\treturn gulp.src({0})\n'.format(love2js.js))
		f.write('\t.pipe(concat(\'{0}.js\'))\n'.format(love2js.package[6]))
		f.write('\t.pipe(gulp.dest(\'dist\'))\n')
		f.write('\t.pipe(rename(\'{0}.min.js\'))\n'.format(love2js.package[6]))
		f.write('\t.pipe(uglify())\n')
		f.write('\t.pipe(insert.prepend(\'/*\\n{0}\\n\'+\n'.format(love2js.package[0]))
		f.write('\t\'{0}\'+\n\t\'{1}\\n{2}\\n*/\\n\'))\n'.format(copyright, license, love2js.package[5]))
		f.write('\t.pipe(gulp.dest(\'dist\'));')
		f.write('\n});\n\n')
		f.write('gulp.task(\'html\', function() {\n')
		f.write('\tvar html=\'<!DOCTYPE html>\\n<head>\'+\n')
		f.write('\t\'\\n<title>{0}<\\/title>\\n\'+\n'.format(love2js.package[0]))
		f.write('\t\'<script type="text/javascript" src="{0}.min.js"></script>\\n\'+\n'
		.format(love2js.package[6]))
		f.write('\t\'</head>\\n<body>\\n<h3 style="text-align: center;">{0}</h3>\\n\'+\n'
		.format(love2js.package[0]))
		f.write('\t\'<canvas id="game"></canvas>\\n</body>\\n</html>\\n\';\n')
		f.write('\tfs.writeFileSync(\'index.html\', html);\n')
		f.write('\treturn gulp.src(\'index.html\')\n')
		f.write('\t.pipe(gulp.dest(\'dist\'));')
		f.write('\n});\n\n')
		f.write('gulp.task(\'clean\', function() {\n')
		f.write('\tfs.unlinkSync(\'dist/{0}.min.js\');\n'.format(love2js.package[6]))
		f.write('\tfs.unlinkSync(\'dist/{0}.js\');\n'.format(love2js.package[6]))
		f.write('\tfs.unlinkSync(\'index.html\');\n')
		f.write('\tfs.rmdir(\'dist\');')
		f.write('\n});\n\n')
		f.write('gulp.task(\'default\', [\'js\',\'html\'], function(){});\n')
		f.close()


# Print as applicable.
def _print(message):
	if love2js.verbose: print(message)


# Handle any command line arguments.
parser = argparse.ArgumentParser(description='love2js: Convert a Love2D game to a JavaScript'
+ '-based HTML5 game. ')
parser.add_argument('-d', '--directory', action='store', dest='directory', metavar="DIRECTORY")
parser.add_argument('-o', '--out', action='store', dest='out', metavar="OUT_DIRECTORY")
parser.add_argument('-m', '--manifest', action='store', dest='manifest', metavar="MANIFEST")
parser.add_argument('-g', '--generate', action='store', dest='generate', metavar="MANIFEST_TO_GENERATE")
parser.add_argument('-q', '--quiet', action='store_false', dest='verbose')
parser.add_argument('-v', '--version', action='store_true', dest='version')
parser.add_argument('-i', '--info', action='store_true', dest='info')
argv = parser.parse_args()

love2js(argv.directory, argv.out, argv.manifest,argv.generate, argv.verbose, argv.version, argv.info)
