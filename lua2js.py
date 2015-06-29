from ast2js import AST2JS
import sys
import os
import glob

def lua2js(lua):

	ast_out = lua.split('.')
	ast_out = ast_out[0] + '.ast'
	os.system('luaparse -b -f {0} > {1}'.format(lua, ast_out))

	ast2js = AST2JS()
	js = ast2js.parse(ast_out)
	print('\nOutput:\n')
	for line in js:
		print(line)

	for ast in glob.glob('*.ast'):
		os.remove(ast)

lua2js(sys.argv[1])
