try:
			for body in ast['body']:
				_type = body['type']
				print(_type)

				if _type == 'AssignmentStatement':
					for _variables in body['variables']:
						if _variables['type'] == 'Identifier':
							self.var_names.append('var ' + _variables['name'])

						elif _variables['type'] == 'MemberExpression':
							indexer = _variables['indexer']
							tn = _variables['identifier'];
							b_tn = _variables['base']
							self.var_names.append(b_tn['name'] + indexer + tn['name'])

					for _init in body['init']:
						if _init['type'] == 'TableConstructorExpression':
							self.var_values.append(' = [];\n')

						elif _init['type'] == 'Identifier':
							self.var_values.append(' = ' + _init['name'] + ';\n')

				if _type == 'FunctionDeclaration':
					t_params = []
					tn = body['identifier']
					for params in body['parameters']:
						t_params.append(params['name'])

					str_params = '';
					for param in t_params:
						str_params += param

					self.var_names.append('function {0}({1}) {{'.format(tn['name'], str_params))
					self.var_values.append('')

					for method_body in body['body']:
						method_type = method_body['type']
						print(method_type)
						if method_type == 'LocalStatement':
							for method_var in method_body['variables']:
								self.var_names.append('\tvar ' + method_var['name'])

							for method_init in method_body['init']:
								raw = method_init['raw']
								self.var_values.append(' = {0};'.format(raw))

						elif method_type == 'IfStatement':
							for method_cl in method_body['clauses']:
								if_type = method_cl['type']
								cond = method_cl['condition']
								left = cond['left']
								right = cond['right']
								r_type = right['type']
								r_raw = right['raw']
								l_base = left['base']
								l_base_indexer = l_base['indexer']

								l_args = left['arguments'][0]
								l_args_raw = l_args['raw']

								l_base_identifier = l_base['identifier']
								l_base_name = l_base_identifier['name']

								l_base_base = l_base['base']
								l_base_base_name = l_base_base['name']
								operator = ''
								if cond['operator'] == '~=':
									operator = '!='

								if r_type == 'NilLiteral':
									r_raw = 'null'

								print(if_type)
								if if_type == 'IfClause':
									print(right)
									self.var_names.append('')
									self.var_values.append('\tif({0}{1}{2}({3}) {4} {5}) {{'.format(l_base_base_name, l_base_indexer, l_base_name, l_args_raw, operator, r_raw))

								#body - 