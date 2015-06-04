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
import shutil
import codecs
import zipfile
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
	use_archive = False

	def __init__(self, directory, lovefile, out, manifest, generate, verbose, version, info):
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

			if lovefile != None:
				self.extractLOVEArchive(lovefile)

			self.copyJSLibs(out)
			self.generateGraphics(out)
			self.generateJS()
			self.generatePackage()
			self.generateGulpfile()

	# Generate a manifest.
	def generateManifest(self, mout):
		name = raw_input('Name (no spaces): ')
		version = raw_input('Version: ')
		desc = raw_input('Description: ')
		author = raw_input('Author: ')
		email = raw_input('E-mail: ')
		license = raw_input('License: ')
		homepage = raw_input('Home page: ')
		_file = raw_input('Filename without ext (e.g. mygame): ')

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
		ff_is = manifest.createTextNode(_file)
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
		_print('Loading manifest...')
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
			print('Conversion map file required ({0}). Not found.\nTerminating.'.format(map_file))
			sys.exit(1)


	# Extract the contents of a LOVE game (archive) file.
	def extractLOVEArchive(self, love_game):
		love2js.use_archive = True
		if zipfile.is_zipfile(love_game):
			_print('Extracting LOVE game (ZIP)...')	
			with zipfile.ZipFile(love_game, 'r') as archive:
				archive.extractall()
		else:
			f = open(love_game, 'rb')
			magic = f.read(1) + f.read(2)
			f.close()

			if magic.startswith('7z'):
				_print('Extracting LOVE game (7z)...')	
				redirect = ''
				if os.name == 'nt':
					redirect  = ' > a.tmp 2>&1'
				else:
					redirect =  ' >> /dev/null 2&1'

				os.system('7z x {0} {1}'.format(love_game, redirect))
				if os.name == 'nt': os.unlink('a.tmp')


	# Generate packages.json file for npm.
	def generatePackage(self):
		_print('Generating package.json...')
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

	# Copy each JavaScript library in /libs directory to build.
	def copyJSLibs(self, directory):
		if not os.path.exists(directory):
			os.mkdir(directory)
		for js in glob.glob('libs/*.js'):
			love2js.js.append(re.sub('libs\\\\|libs/js', '', js))
			shutil.copy(js, 'html5/')

	# Generate graphics (data URIs and graphics.js file).
	def generateGraphics(self, directory):
		_print('Generating graphics and graphics.js...')
		use_graphics = False
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
		_print('Generating game scripts...')
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
			if lua == 'main.lua':
				f.write('window.onload = function() {\n')
				f.write('\nvar canvas = document.getElementById(\'game\');\n')
				f.write('canvas.style.marginLeft = \'auto\';\n')
				f.write('canvas.style.marginRight = \'auto\';\n')
				f.write('canvas.style.display = \'block\';\n')
				f.write('canvas.style.border = \'1px dotted #000000\';\n')
				
				for line in js:
					f.write(line)

				f.write('\nfunction love_setMode(width, height) {\n')
				f.write('\tcanvas.width = width.toString();\n\tcanvas.height = height.toString();\n}\n')

				f.write('\nfunction love_setBackgroundColor(r, g, b) {\n')
				f.write('\tcanvas.style.backgroundColor = \'rgb(\' + r + \',\' + g + \',\' + b + \')\';\n}\n')

				f.write('\nfunction love_setTitle(title) {\n')
				f.write('\tdocument.title = title;\n')
				f.write('\tdocument.getElementById(\'game-title\').innerText = title;\n}\n')

				f.write('\nfunction love_print(message, x, y) {\n')
				f.write('\tvar context = canvas.getContext(\'2d\');\n')
				f.write('\tcontext.font = \'10pt Verdana\';\n')
				f.write('\tcontext.fillStyle = \'white\';\n')
				f.write('\tcontext.fillText(message, x, y);\n')
				f.write('}\n')

				f.write('\nfunction love_getGraphic(graphic) {\n')
				f.write('\treturn graphics[gfx_fns.indexOf(graphic)];\n}\n')

				f.write('\nfunction love_drawGraphic(graphic, x, y) {\n')
				f.write('\tvar context = canvas.getContext(\'2d\');\n')
				f.write('\tvar g = new Image();\n\tg.src = graphic;\n')
				f.write('\tcontext.drawImage(g, x, y, g.width, g.height);\n}\n')

				f.write('\nfunction love_drawRectangle(type, x, y, width, height) {\n')
				f.write('\tvar context = canvas.getContext(\'2d\');\n')
				f.write('\tif(type == \'fill\') {\n')
				f.write('\t\tcontext.fillRect(x, y, width, height);\n\t}\n')
				f.write('\telse {\n\t\tcontext.rect(x, y, width, height);\n\t\tcontext.stroke();\n\t}\n}\n')
				f.write('\nlove_load();\nlove_draw();\n}\n')
			else:
				for line in js:
					f.write(line)

			f.close()

			for js in glob.glob('html5/*.js'):

				f = codecs.open(js, 'r', 'utf-8')
				lines = f.readlines()
				f.close()

				newLines = []
				class_name = ''
				for line in lines:
					if line.startswith('// Class is'):
						cd = line.split('=')
						class_name = cd[1].lstrip().rstrip()

				for line in lines:
					pattern = '^(function) ({0})\.(\w+)(.*)'.format(class_name)
					m = re.match(pattern, line)
					if m != None:
						line = '{0}.prototype.{1} = {2}{3}'.format(m.group(2), m.group(3), m.group(1), m.group(4))
						line = line.rstrip() + ' {\n'
						line = re.sub('\{ \{', '{', line)

					pattern = '(\w+ \=) ([A-Z]{1}\w+)\s+(\(.*)'
					m = re.search(pattern, line)
					if m != None:
						line = '\t{0} new {1}{2}'.format(m.group(1), m.group(2), m.group(3))


					pattern = '(var*) (\w+ \=) ([A-Z]{1}\w+)\s+(\(.*)'
					m = re.search(pattern, line)
					if m != None:
						line = '\t{0} {1} new {2}{3}'.format(m.group(1), m.group(2), m.group(3), m.group(4))

					newLines.append(line)

				f = codecs.open(js, 'w', 'utf-8')
				for line in newLines:
					f.write(line)
				f.close()

	# Generate Gulpfile for Gulp.js
	def generateGulpfile(self):
		_print('Generating Gulpfile.js...')
		dt = str(datetime.now())
		m = re.match('(\d{4})', dt)
		year = str(m.group(0))
		copyright = 'Copyright {0} {1}'.format(year, love2js.package[3])
		license = '\\nReleased under the {0} License.'.format(love2js.package[4])
		uses = 'Uses sprintf-js | Alexandru Marasteanu <hello@alexei.ro> (http://alexei.ro/) | BSD-3-Clause'

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
		f.write('\t\'{0}\'+\n\t\'{1}\\n{2}\\n\\n\'+\n\t\'{3}\\n*/\\n\'))\n'
		.format(copyright, license, love2js.package[5], uses))
		f.write('\t.pipe(gulp.dest(\'dist\'));')
		f.write('\n});\n\n')
		f.write('gulp.task(\'html\', function() {\n')
		f.write('\tvar html=\'<!DOCTYPE html>\\n<head>\'+\n')
		f.write('\t\'\\n<title>{0}<\\/title>\\n\'+\n'.format(love2js.package[0]))
		f.write('\t\'<script type="text/javascript" src="{0}.min.js"></script>\\n\'+\n'
		.format(love2js.package[6]))
		f.write('\t\'</head>\\n<body>\\n<h3 id="game-title" style="text-align: center;">{0}</h3>\\n\'+\n'
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
parser.add_argument('-l', '--lovefile', action='store', dest='lovefile', metavar="LOVE GAME FILE")
parser.add_argument('-o', '--out', action='store', dest='out', metavar="OUT_DIRECTORY")
parser.add_argument('-m', '--manifest', action='store', dest='manifest', metavar="MANIFEST")
parser.add_argument('-g', '--generate', action='store', dest='generate', metavar="MANIFEST TO GENERATE")
parser.add_argument('-q', '--quiet', action='store_false', dest='verbose')
parser.add_argument('-v', '--version', action='store_true', dest='version')
parser.add_argument('-i', '--info', action='store_true', dest='info')
argv = parser.parse_args()

love2js(argv.directory, argv.lovefile, argv.out, argv.manifest,argv.generate, argv.verbose,
argv.version, argv.info)
