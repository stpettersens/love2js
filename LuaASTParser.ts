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

	private parseStringCallExpression(body: Object): void {
		Debug.emit(this.debug, 'StringCallExpression');
		var name = body['base']['name'];
		var arg = body['argument']['raw'];
		this.var_names.push(name);
		this.var_values.push(' ' + arg);
	}

	private parseCallStatement(body: Object, indent: string): void {
		Debug.emit(this.debug, 'CallStatement');
		var name: string = '';
		for(var key in body) {
			if(body.hasOwnProperty(key)) {
				if(key == 'expression') {
					name = body[key]['base']['name'];
					for(var i: number = 0; i < body[key]['arguments'].length; i++) {
						if(body[key]['arguments'][i]['type'].indexOf('Literal') != -1) {
							var arg_value: string = body[key]['arguments'][i]['raw'];
							this.var_names.push(indent + name + '(' + arg_value + ');');
							this.var_values.push('');

						}
						else if(body[key]['arguments'][i]['type'] == 'Identifier') {
							var arg_name: string = body[key]['arguments'][i]['name'];
							this.var_names.push(indent + name + '(' + arg_name + ');');
							this.var_values.push('');
						}
						else if(body[key]['arguments'][i]['base']['type'] == 'MemberExpression') {
							Debug.emit(this.debug, 'MemberExpression');
							var indexer: string = body[key]['arguments'][i]['base']['indexer'];
							var arg_name: string = body[key]['arguments'][i]['base']['identifier']['name'];
							var arg_base: string = body[key]['arguments'][i]['base']['base']['name'];

							var further_args: string = '(';
							for(var x: number = 0; x < body[key]['arguments'][i]['arguments'].length; x++) {
								if(body[key]['arguments'][i]['arguments'][x]['type'].indexOf('Literal') != -1) {
									further_args += body[key]['arguments'][i]['arguments'][x]['raw'];
								}
								else {
									further_args += body[key]['arguments'][i]['arguments'][x]['name'];
								}
								if(x < body[key]['arguments'][i]['arguments'].length - 1) further_args += ', ';
							}
							further_args += ')';

							this.var_names.push(indent + name + '(' + arg_base + indexer + arg_name + further_args + ');');
							this.var_values.push('');

							//this.echo();
							//process.exit();
						}
					}
				}
			}
		}
	}

	private parseForNumericStatement(body: Object, indent: string): void {
		Debug.emit(this.debug, 'ForNumericStatement');
		var variable: string = '';
		var start: any;
		var end: any;
		var step: string;
		for(var key in body) {
			if(key == 'variable') {
				if(body[key]['type'] == 'Identifier') {
					variable = body[key]['name'];
				}
				else variable = body[key]['raw'];
			}
			else if(key == 'start') {
				if(body[key]['type'].indexOf('Literal') != -1) {
					start = parseInt(body[key]['raw']) - 1;
				}
			}
			else if(key == 'step') {
				step = '++';
			}
			else if(key == 'end') {
				if(body[key]['argument']['type'].indexOf('Identifier') != -1) {
					end = body[key]['argument']['name'];
				}
				else end = body[key]['argument']['raw'];
				this.var_names.push(indent + 'for(var ' + variable + ' = ' + start + '; ' + variable + ' < ' + end + '; ' + variable + '++) {');
				this.var_values.push('');
			}
			else if(key == 'body') {
				this.parseNext(body[key], indent + '\t');
			}
		}
		this.var_names.push(indent + '}');
		this.var_values.push('');
	}

	private parseIfStatement(body: Object, indent: string): void {
		Debug.emit(this.debug, 'IfStatement');
		var type: string = '';
		var operator: string = '';
		var l_op: string = '';
		var l_arg: string = '';
		var l_value: string = '';
		for(var key in body) {
			if(body.hasOwnProperty(key)) {
				if(key == 'clauses') {
					for(var i: number = 0; i < body[key].length; i++) {
						type = body[key][i]['type'];
						if(type == 'IfClause') type = 'if';
						operator = body[key][i]['condition']['operator'];

						console.log(body[key][i]['condition']);

						this.echo();
						process.exit();

						if(body[key][i]['condition']['left']['type'] == 'Identifier') {

						}
						else if(body[key][i]['condition']['left']['type'] == 'BinaryExpression') {

						}
						else if(body[key][i]['condition']['left']['type'] == 'UnaryExpression') {
							l_op = body[key][i]['condition']['left']['operator'];
							if(l_op == '#') l_op = 'sizeof:';

							l_arg = body[key][i]['condition']['left']['argument']['name'];
							l_value = body[key][i]['condition']['right']['raw'];

							this.var_names.push(indent + type + '(' + l_op + l_arg + operator + ' ' + l_value + ') {');
							this.var_values.push('');
						}
						this.parseNext(body[key][i]['body'], indent + '\t');
					}
				}
			}
		}
		this.var_names.push(indent + '}');
		this.var_values.push('');
	}

	private parseAssignmentStatement(body: Object, indent: string): void {
		Debug.emit(this.debug, 'AssignmentStatement');
		for(var key in body) {
			if(body.hasOwnProperty(key)) {
				if(key == 'variables') {
					for(var i: number = 0; i < body[key].length; i++) {
						var variable = body[key][i]['name'];
						this.var_names.push(indent + variable);
					}
				}
				else if(key == 'init') {
					for(var i: number = 0; i < body[key].length; i++) {
						var value: string = '';
						if(body[key][i]['type'].indexOf('Literal')) {
							value = body[key][i]['raw'];
						}
						else {
							value = body[key][i]['name'];
						}
						this.var_values.push(' = ' + value + ';');
					}
				}
			}
		}
	}

	private parseLocalStatement(body: Object, indent: string): void {
		Debug.emit(this.debug, 'LocalStatement');
		for(var key in body) {
			if(body.hasOwnProperty(key)) {
				if(key == 'variables') {
					for(var i: number = 0; i < body[key].length; i++) {
						var variable = body[key][i]['name'];
						this.var_names.push(indent + 'var ' + variable);
					}
				}
				else if(key == 'init') {
					for(var i: number = 0; i < body[key].length; i++) {
						var value: string = '';
						if(body[key][i]['type'].indexOf('Literal')) {
							value = body[key][i]['raw'];
						}
						else {
							value = body[key][i]['name'];
						}
						this.var_values.push(' = ' + value + ';');
					}
				}
			}
		}
	}

	private parseFunctionDeclaration(body: Object, indent: string): void {
		Debug.emit(this.debug, 'FunctionDeclaration');
		var name: string = null;
		var params: string = '';
		for(var key in body) {
			if(body.hasOwnProperty(key)) {
				if(key == 'identifier') {
					if(body[key]['type'] == 'MemberExpression') {
						Debug.emit(this.debug, 'MemberExpression');
						var idx: string = body[key]['indexer'];
						var n: string = body[key]['identifier']['name'];
						var b: string = body[key]['base']['name'];
						name = b + idx + n;
					}
					else {
						name = body[key]['name'];
					}
				}
				else if(key == 'parameters') {
					for(var i: number = 0; i < body[key].length; i++) {
						params += body[key][i]['name'];
						if(i < body[key].length - 1) params += ', ';
					}
					this.var_names.push('function ' + name +  '(' + params + ') {');
					this.var_values.push('');
				}
				else if(key == 'body') {
					console.log('Parsing Next!');
					this.parseNext(body[key], indent + '\t');
				}
			}
		}
		this.var_names.push('}');
		this.var_values.push('');
	}

	private parseNext(body: string[], indent: string): void {
		for(var i: number = 0; i < body.length; i++) {
			if(body[i]['type'] == 'LocalStatement') {
				this.parseLocalStatement(body[i], indent);
			}
			else if(body[i]['type'] == 'AssignmentStatement') {
				this.parseAssignmentStatement(body[i], indent);
			}
			else if(body[i]['type'] == 'IfStatement') {
				this.parseIfStatement(body[i], indent);
			}
			else if(body[i]['type'] == 'CallStatement') {
				this.parseCallStatement(body[i], indent);
			}
			else if(body[i]['type'] == 'ForNumericStatement') {
				this.parseForNumericStatement(body[i], indent);
			}
		}
	}

	public parse(ast: Object): string[] {
		var body = ast['body'];
		for(var key in body) {
			if(body.hasOwnProperty(key)) {
				if(body[key]['type'] == 'FunctionDeclaration') {
					this.parseFunctionDeclaration(body[key], '');
				}
				else if(body[key]['type'] == 'LocalStatement') {
					this.parseLocalStatement(body[key], '');
				}
				else if(body[key]['type'] == 'AssignmentStatement') {
					this.parseAssignmentStatement(body[key], '');
				}
				else if(body[key]['type'] == 'IfStatement') {
					this.parseIfStatement(body[key], '');
				}
				else if(body[key]['type'] == 'CallStatement') {
					if(body[key]['expression']['type'] == 'StringCallExpression') {
						this.parseStringCallExpression(body[key]['expression']);
					}
					else {
						this.parseCallStatement(body[key], '');
					}
				}
				else if(body[key]['type'] == 'ForNumericStatement') {
					this.parseForNumericStatement(body[key], '');
				}
			}
		}
		return this.returnJS();
	}
}

class Debug {
	public static emit(debug: boolean, message: Object) {
		if(debug) console.log(message);
	}
}

export = LuaASTParser;
