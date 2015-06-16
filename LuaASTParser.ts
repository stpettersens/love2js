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

	private echo(): void {
		Debug.emit(this.debug, '');
		Debug.emit(this.debug, this.var_names);
		Debug.emit(this.debug, this.var_values);
	}

	private returnJS(): string[] {
		var javascript = new Array<string>();
		for(var i: number = 0; i < this.var_names.length; i++) {
			javascript.push(this.var_names[i] + this.var_values[i]);
		}
		return javascript;
	}

	private parseAssignmentStatement(body: any, indent: string): void {
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
	}

	private parseLocalStatement(body: any, indent: string): void {
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

	private parseIfStatement(body: any, indent: string): void {
		Debug.emit(this.debug, 'IfStatement');
		var clauses: string[] = body['clauses'];
		for(var i: number = 0; i < clauses.length; i++) {
			var type: string = clauses[i]['type'] 
			if(type == 'IfClause') type = 'if';
			var operator: string = clauses[i]['condition']['operator'];
			if(operator == '~=') operator = '!=';
			var l_operator: string = clauses[i]['condition']['left']['operator'];
			if(l_operator == '#') l_operator = 'sizeof:';
			var l_arg_name: string = clauses[i]['condition']['left']['argument']['name'];
			var r_value: string = clauses[i]['condition']['right']['raw'];

			this.var_names.push(indent + type + '(' + l_operator + l_arg_name + operator + ' ' + r_value + ') {');
			this.var_values.push('');

			var cb: string[] = clauses[i]['body'];
			for(var i: number = 0; i < cb.length; i++) {
				var t = cb[i]['type'];
				if(t == 'AssignmentStatement') {
					var i_indent: string = indent + '\t';
					this.parseAssignmentStatement(cb[i], i_indent);
				}
			}
		}
		this.var_names.push(indent + '}');
		this.var_values.push('');
	}

	private parseCallStatement(body: any, indent: string): void {
		Debug.emit(this.debug, 'CallStatement');
		var name: string = body['expression']['base']['name'];
		var arguments: string[] = body['expression']['arguments'];
		var args: string = '';
		var f_args: string = '';
		for(var i: number = 0; i < arguments.length; i++) {
			if(arguments[i]['type'] == 'CallExpression') {
				if(arguments[i]['base']['type'] == 'MemberExpression') {
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
			else {
				args += arguments[i]['raw'];
				if(i < arguments.length - 1) args += ', ';
			}
		}

		args = args.replace('$args', f_args)
		this.var_names.push(indent + name + '(' + args + ');');
		this.var_values.push('');
	}

	private parseFunctionDeclaration(body: any, indent: string): void {
		Debug.emit(this.debug, 'FunctionDeclaration');
		var name: string = body['identifier']['name'];
		var params: string = '';
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
				this.parseCallStatement(body[i], '');
			}
		}
		this.echo();
		return this.returnJS();
	}
}

class Debug {
	
	public static emit(debug: boolean, message: any) {
		if(debug) console.log(message);
	}
}

export = LuaASTParser;
