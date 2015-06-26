/*
Generate intermediate JavaScript from luaparser's JSON Abstract Syntax Tree.
*/

class LuaASTParser {
	
	private debug: boolean;
	private var_names: string[];
	private var_values: string[];

	constructor(debug: boolean) {
		this.debug = debug;
		this.var_names = new Array<string>();
		this.var_values = new Array<string>();
	}

	public echo(): void {
		console.log('');
		console.log(this.var_names);
		console.log(this.var_names.length);
		console.log(this.var_values);
		console.log(this.var_values.length);
	}

	private returnJS(): string[] {
		var javascript = new Array<string>();
		for(var i: number = 0; i < this.var_names.length; i++) {
			javascript.push(this.var_names[i] + this.var_values[i]);
		}
		return javascript;
	}

	private parseAssignmentStatement(body: Object, indent: string): void {
		Debug.emit(this.debug, 'AssignmentStatement');
		var variables: string[] = body['variables'];
		var inits: string[] = body['init'];
		var value: string = '';

		for(var i: number = 0; i < variables.length; i++) {
			this.var_names.push(indent + variables[i]['name']);
		}

		for(var i: number = 0; i < inits.length; i++) {
			if(inits[i]['type'] == 'TableConstructorExpression') {
				Debug.emit(this.debug, 'TableConstructorExpression');
				value = '[]';
			}
			else value = inits[i]['raw'];
			this.var_values.push(' = ' + value + ';');
		}

		this.echo();
	}

	private parseLocalStatement(body: Object, indent: string): void {
		Debug.emit(this.debug, 'LocalStatement');
		var variables: string[] = body['variables'];
		var inits: string[] = body['init'];
		var value: string = '';

		for(var i: number = 0; i < variables.length; i++) {
			this.var_names.push(indent + 'var ' + variables[i]['name']);
		}

		for(var i: number = 0; i < inits.length; i++) {
			if(inits[i]['type'] == 'TableConstructorExpression') {
				Debug.emit(this.debug, 'TableConstructorExpression');
				value = '[]';
			}
			else value = inits[i]['raw'];
			this.var_values.push(' = ' + value + ';');
		}
	}

	private parseIfStatement(body: Object, indent: string): void {
		Debug.emit(this.debug, 'IfStatement');
		var clauses: string[] = body['clauses'];
		for(var i: number = 0; i < clauses.length; i++) {
			if(clauses[i]['condition']['type'] == 'BinaryExpression') {
				var operator: string = clauses[i]['condition']['operator'];
				var l_op: string = null;
				var r_op: string = null;
				var l_arg: string = null;
				var r_arg: string =  null;
				var l_index: string = null;
				var r_index: string = null;
				var l_value: string = null;
				var r_value: string = null;
				if(operator == '~=') operator = '!=';
				if(clauses[i]['condition']['left']['type'] == 'UnaryExpression') {
					l_op= clauses[i]['condition']['left']['operator'];
					if(l_op == '#') l_op = 'sizeof:';
					if(clauses[i]['condition']['left']['argument']['type'] == 'Identifier') {
						l_arg = clauses[i]['condition']['left']['argument']['name'];
					}
				}
				if(clauses[i]['condition']['right']['type'].indexOf('Literal') != -1) {
					r_value = clauses[i]['condition']['right']['raw'];
				}
				else {
					r_value = clauses[i]['condition']['right']['name'];
				}

				this.var_names.push(indent + 'if(' + l_op + l_arg + operator + ' ' + r_value + ') {');
			}
			else if(clauses[i]['condition']['type'] == 'LogicalExpression') {
				console.log('Encountered LogicalExpression...');
				operator = clauses[i]['condition']['operator'];
				if(operator == 'or') operator = '||';
				if(operator == 'and') operator = '&&';
				if(clauses[i]['condition']['left']['type'] == 'BinaryExpression') {
					l_op = clauses[i]['condition']['left']['operator'];
					if(clauses[i]['condition']['left']['left']['type'] == 'IndexExpression') {
						if(clauses[i]['condition']['left']['left']['base']['type'] == 'Identifier') {
							l_arg = clauses[i]['condition']['left']['left']['base']['name'];
							if(clauses[i]['condition']['left']['left']['index']['type'] == 'Identifier') {
								l_index = clauses[i]['condition']['left']['left']['index']['name'];
							}
							else {
								l_index = clauses[i]['condition']['left']['left']['index']['raw'];
							}
						}
					}
				}

				if(clauses[i]['condition']['right']['type'] == 'BinaryExpression') {
					r_op = clauses[i]['condition']['right']['operator'];
					if(clauses[i]['condition']['right']['left']['type'] == 'IndexExpression') {
						var index: string = null;
						if(clauses[i]['condition']['right']['left']['base']['type'] == 'Identifier') {
							r_arg = clauses[i]['condition']['right']['left']['base']['name'];
							if(clauses[i]['condition']['right']['left']['index']['type'] == 'Identifier') {
								r_index = clauses[i]['condition']['right']['left']['index']['name'];
							}
							else {
								r_index = clauses[i]['condition']['right']['left']['index']['raw'];
							}
						}
					}
				}

				if(clauses[i]['condition']['left']['right']['type'].indexOf('Literal') != -1) {
					l_value = clauses[i]['condition']['left']['right']['raw'];
				}
				else {
					l_value = clauses[i]['condition']['left']['right']['name'];
				}

				if(clauses[i]['condition']['right']['right']['type'].indexOf('Literal') != -1) {
					r_value = clauses[i]['condition']['right']['right']['raw'];
				}
				else {
					r_value = clauses[i]['condition']['right']['right']['name'];
				}

				this.var_names.push(indent + 'if(' + l_arg + '[' + l_index + '] ' + l_op +  ' ' +  l_value +  ' ' + operator + ' ' + r_arg + '[' + r_index + '] ' + r_op + ' ' + r_value + ') {');
			}

			this.var_values.push('');

			var cb: string[] = clauses[i]['body'];
			for(var i: number = 0; i < cb.length; i++) {
				var t = cb[i]['type'];
				var iindent: string = indent + '\t';
				if(t == 'AssignmentStatement') {
					this.parseAssignmentStatement(cb[i], iindent);
				}
			}
		}
		this.var_names.push(indent + '}');
		this.var_values.push('');
	}

	private parseCallStatement(body: Object, indent: string): void {
		Debug.emit(this.debug, 'CallStatement');
		var name: string = body['expression']['base']['name'];
		var arguments: string[] = body['expression']['arguments'];
		var args: string = '';
		var f_args: string = '';

		for(var i: number = 0; i < arguments.length; i++) {
			if(arguments[i]['type'] == 'Identifier') {
				args += arguments[i]['name'];
			}
			else {
				args += arguments[i]['raw'];
			}

			if(arguments[i]['type'] == 'CallExpression') {
				if(arguments[i]['base']['type'] == 'MemberExpression') {
					args = '';
					Debug.emit(this.debug, 'MemberExpression');
					var indexer: string = arguments[i]['base']['indexer'];
					var identifier: string = arguments[i]['base']['identifier'];
					var base_name: string = arguments[i]['base']['base']['name'];
					args += base_name + indexer + identifier['name'] + '($args)';

					var further_args: string[] = arguments[i]['arguments'];
					for(var i: number = 0; i < further_args.length; i++) {
						var value: string = '';
						if(further_args[i]['type'] == 'Identifier') {
							value = further_args[i]['name'];
						}
						else {
							value = further_args[i]['raw']
						}
						if(i < further_args.length - 1) value += ', ';
						f_args += value;
					}
				}
			}
			if(i < arguments.length - 1) args += ', ';
		}
		if(f_args !== '') args = args.replace('$args', f_args)
		this.var_names.push(indent + name + '(' + args + ');');
		this.var_values.push('');
	}

	private parseForNumericStatement(body: Object, indent: string): void {
		Debug.emit(this.debug, 'ForNumericStatement');
		var name: string = body['variable']['name'];
		var sta_raw: number = parseInt(body['start']['raw']) - 1;
		var operator: string = body['end']['operator'];
		if(operator == '#') operator = 'sizeof:';
		if(operator == undefined) operator = '';

		var end_arg: string = null;

		if(body['end']['type'].indexOf('Literal') != -1) {
			end_arg = body['end']['raw'];
		}
		else {
			end_arg = body['end']['argument']['name'];
		}

		this.var_names.push(indent + 'for(var ' + name + ' = ' + sta_raw + '; ' + name + ' < ' + operator + end_arg + '; ' + name + '++) {');
		this.var_values.push('');

		for(var i: number = 0; i < body['body'].length; i++) {
			var type = body['body'][i]['type'];
			var iindent: string = indent + '\t';
			if(type == 'IfStatement') {
				this.parseIfStatement(body['body'][i], iindent);
			}
			else if(type == 'CallStatement') {
				this.parseCallStatement(body['body'][i], iindent);
			}
		}

		this.var_names.push(indent + '}');
		this.var_values.push('')
	}

	private parseStringCallExpression(body: Object): void {
		Debug.emit(this.debug, 'StringCallExpression');
		var name = body['base']['name'];
		var arg = body['argument']['raw'];
		this.var_names.push(name);
		this.var_values.push(arg);
	}

	private parseFunctionDeclaration(body: Object, indent: string): void {
		Debug.emit(this.debug, 'FunctionDeclaration');
		var name: string = body['identifier']['name'];
		var params: string = '';

		if(body['identifier']['type'] == 'MemberExpression') {
			var indexer: string = body['identifier']['indexer']
			var nname: string = body['identifier']['identifier']['name'];
			var base: string = body['identifier']['base']['name'];
			name = base + indexer + nname;
		}

		for(var i: number = 0; i < body['parameters'].length; i++) {
			params += body['parameters'][i]['name'];
			if(i == body['parameters'].lengh - 1) params + ' , ';
		}
		this.var_names.push('function ' + name + '(' + params + ') {');
		this.var_values.push('');

		for(var i: number = 0; i < body['body'].length; i++) {
			var type = body['body'][i]['type'];
			if(type == 'AssignmentStatement') {
				this.parseAssignmentStatement(body['body'][i], '\t');
			}
			else if(type == 'LocalStatement') {
				this.parseLocalStatement(body['body'][i], '\t');
			}
			else if(type == 'IfStatement') {
				this.parseIfStatement(body['body'][i], '\t');
			}
			else if(type == 'CallStatement') {
				this.parseCallStatement(body['body'][i], '\t');
			}
			else if(type == 'ForNumericStatement') {
				this.parseForNumericStatement(body['body'][i], '\t');
			}
		}
		this.var_names.push(indent + '}');
		this.var_values.push('');
	}

	public parse(ast: Object): string[] {
		var body = ast['body'];
		for(var i: number = 0; i < body.length; i++) {
			var type: string = body[i]['type'];
			if(type == 'AssignmentStatement') {
				this.parseAssignmentStatement(body[i], '');
			}
			else if(type == 'LocalStatement') {
				this.parseLocalStatement(body[i], '');
			}
			else if(type == 'FunctionDeclaration') {
				this.parseFunctionDeclaration(body[i], '');
			}
			else if(type == 'IfStatement') {
				this.parseIfStatement(body[i], '');
			}
			else if(type == 'CallStatement') {
				if(body[i]['expression']['type'] == 'StringCallExpression') {
					this.parseStringCallExpression(body[i]['expression']);
				}
				else {
					this.parseCallStatement(body[i], '');
				}
			}
			else if(type == 'ForNumericStatement') {
				this.parseForNumericStatement(body[i], '');
			}
		}
		this.echo();
		return this.returnJS();
	}
}

class Debug {
	
	public static emit(debug: boolean, message: Object) {
		if(debug) console.log(message);
	}
}

export = LuaASTParser;
