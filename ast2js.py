"""
Generate JavaScript from JSON Abstract Syntax Tree.
"""
import re
import json
import codecs

class AST2JS:

	def __init__(self):
		self.var_names = [];
		self.var_values = [];

	def parse(self, ast_file):
		f = codecs.open(ast_file, 'r', 'utf-8')
		lines = f.readlines()		
		f.close()
		ast = json.loads(''.join(lines))

		try:
			for body in ast['body']:
				statement_type = body['type']

				if statement_type == 'AssignmentStatement':
					self.parseAssignmentStatement(body)

				elif statement_type == 'FunctionDeclaration':
					self.parseFunctionDeclaration(body)

				elif statement_type == 'IfStatement':
					self.parseIfStatement(body)

				elif statement_type == 'CallStatement':
					expression = body['expression']
					if expression['type'] == 'StringCallExpression':
						self.parseStringCallExpression(expression)
					else:
						self.parseCallStatement(body)

			self.echoVars()
			return self.returnJS()

		except KeyError:
			pass


	def parseAssignmentStatement(self, body, indent=''):
		print('AssignmentStatement')
		variables = body['variables']
		inits = body['init']
		for var in variables:
			self.var_names.append(indent + var['name'])

		for init in inits:
			if init['type'] == 'TableConstructorExpression':
				print('TableConstructorExpression')
				value = '[]' 
			else:
				value = init['raw'];

			self.var_values.append(' = {0};'.format(value))

	def parseFunctionDeclaration(self, body, indent=''):

		print('FunctionDeclaration')
		identifier = body['identifier']
		
		if identifier['type'] == 'MemberExpression':
			indexer = identifier['indexer']
			i_identifier = identifier['identifier']
			name = i_identifier['name']
			base = identifier['base']
			base_name = base['name']
			identifier['name'] = base_name + indexer + name

		params = ''
		for param in body['parameters']:
				params += param['name']

		self.var_names.append(indent + 'function {0}({1}) {{'.format(identifier['name'], params))
		self.var_values.append('')

		for function_body in body['body']:
			function_type = function_body['type']
			if function_type == 'AssignmentStatement':
				self.parseAssignmentStatement(function_body, '\t')

			elif function_type == 'IfStatement':
				self.parseIfStatement(function_body, '\t')

			elif function_type == 'CallStatement':
				self.parseCallStatement(function_body, '\t')

			elif function_type == 'ForNumericStatement':
				self.parseForNumericStatement(function_body, '\t')
	
		self.var_names.append(indent + '}')
		self.var_values.append('')

	def parseForNumericStatement(self, body, indent=''):
		print('ForNumericStatement')
		variable = body['variable']
		name = variable['name']
		start = body['start']
		sta_raw = int(start['raw']) - 1
		end = body['end']
		operator = end['operator']
		end_arg = end['argument']
		end_arg_name = end_arg['name']

		self.var_names.append(indent + 'for(var {0} = {1} < {2}{3}) {{'.format(name, sta_raw, operator, end_arg_name))
		self.var_values.append('')

		for forBody in body['body']:
			if forBody['type'] == 'IfStatement':
				iindent = indent + '\t'
				self.parseIfStatement(forBody, iindent)

	def parseIfStatement(self, body, indent=''):
		print('IfStatement')
		clauses = body['clauses']
		for clause in clauses:

			print(clause)

			clause_type = clause['type']
			if clause_type == 'IfClause': clause_type = 'if';
			condition = clause['condition']
			clause_body = clause['body']
			operator = condition['operator']
			left = condition['left']
			l_operator = left['operator']
			l_argument = left['argument']
			l_arg_name = l_argument['name']
			right = condition['right']
			r_arg_val = right['raw']
			self.var_names.append(indent + '{0}({1}{2} {3} {4}) {{'
			.format(clause_type, l_operator, l_arg_name, operator, r_arg_val))
			self.var_values.append('')

			for c in clause_body:
				if c['type'] == 'AssignmentStatement':
					if indent == '\t': iindent = '\t\t'
					self.parseAssignmentStatement(c, iindent)

			self.var_names.append(indent + '}')
			self.var_values.append('')

	def parseCallStatement(self, body, indent=''):
		print('CallStatement')
		expression = body['expression']
		base = expression['base']
		name = base['name']
		arguments = expression['arguments']

		args = ''
		indexer = ''
		arg_name = ''
		f_arg_name = ''
		for arg in arguments:
			if arg['type'] == 'CallExpression':
				base = arg['base']

				if base['type'] == 'MemberExpression':
					print('MemberExpression')
					indexer = base['indexer']
					identifier = base['identifier']
					base_base = base['base']
					base_name = base_base['name']
					arg_name += '{0}{1}{2}($args)'.format(base_name, indexer, identifier['name'])

					further_args = arg['arguments']
					i = 1
					for fa in further_args:
						value = ''
						if fa['type'] == 'Identifier':
							value = fa['name']
						else:
							value = fa['raw']

						if i < len(further_args): value += ', '
						i = i + 1

						f_arg_name += value
			else:
				arg_name += arg['raw']
					
		arg_name = re.sub('\$args', f_arg_name, arg_name)
		self.var_names.append(indent + '{0}({1});'.format(name, arg_name))
		self.var_values.append('')

	def parseStringCallExpression(self, body):
		print('StringCallExpression')
		base = body['base']
		name = base['name']
		argument = body['argument']
		arg_value = argument['raw']

		self.var_names.append(name)
		self.var_values.append(arg_value)

	def echoVars(self):
		print(self.var_names)
		print(self.var_values)

	def returnJS(self):
		i = 0
		javascript = []
		for value in self.var_values:
			javascript.append('{0}{1}'.format(self.var_names[i], value))
			i = i + 1

		return javascript
