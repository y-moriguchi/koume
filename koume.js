/*
 * Koume
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
(function(root) {
	var undef = void 0;
	function isArray(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	}
	function isInteger(x) {
		return typeof x === "number" && isFinite(x) && Math.floor(x) === x;
	}
	function getOneAndOnlyField(obj) {
		var res = undef;
		for(i in obj) {
			if(obj.hasOwnProperty(i)) {
				if(res === undef) {
					res = i;
				} else {
					throw new Error("There are two fields in object");
				}
			}
		}
		if(res === undef) {
			throw new Error("No fields in object");
		}
		return res;
	}
	function getValueOfOneAndOnlyField(obj, field) {
		var res = undef;
		for(i in obj) {
			if(obj.hasOwnProperty(i)) {
				if(res === undef) {
					res = i;
				} else {
					return undef;
				}
			}
		}
		return res === field ? obj[field] : undef;
	}
	function createMacroEnv(funcs) {
		var macroNames = [],
			env = createGlobalEnv(funcs),
			me;
		me = {
			expand1: function(name, target) {
				var expanded;
				expanded = execVM(traverse([name, { q: target }], funcs, me), env, funcs);
				if(expanded === null || expanded.type !== "literal" || expanded.val === null) {
					throw new Error("macro cannot expand");
				}
				return expanded.val;
			},
			bindMacro: function(name, patterns) {
				var res,
					code;
				res = {
					"function": {
						name: name,
						args: ["_target"],
						begin: [
							{
								match: {
									target: "_target",
									patterns: patterns
								}
							}
						]
					}
				};
				code = traverse(res, funcs, me);
				execVM(code, env, funcs);
				macroNames.push(name);
			},
			hasMacro: function(name) {
				return macroNames.indexOf(name) >= 0;
			}
		};
		return me;
	}
	function traverse(input, funcs, macroEnv) {
		function outputBegin(list, isTail) {
			var i,
				res;
			for(i = 0, res = []; i < list.length; i++) {
				res = res.concat(walk(list[i], isTail && i === list.length - 1));
				if(i < list.length - 1) {
					res.push("pop");
				}
			}
			return res;
		}
		function walkqq(input) {
			var i,
				res,
				uq;
			if(isArray(input)) {
				for(i = 0, res = ["list"]; i < input.length; i++) {
					res.push(walkqq(input[i]));
				}
				return res;
			} else if(typeof input === "object" && input !== null) {
				if((uq = getValueOfOneAndOnlyField(input, "uq")) !== undef) {
					return uq;
				} else {
					res = {};
					for(i in input) {
						if(input.hasOwnProperty(i)) {
							res[i] = walkqq(input[i]);
						}
					}
					return { "cons": res };
				}
			} else {
				return { "q": input };
			}
		}
		function walk(input, isTail) {
			var i,
				res,
				resIf,
				resElse,
				resTarget,
				elseAddrs,
				func;
			if(isArray(input)) {
				res = ["stopArgs"];
				for(i = input.length - 1; i >= 0; i--) {
					res = res.concat(walk(input[i]));
				}
				res.push(isTail ? "callTail" : "call");
				return res;
			} else if(typeof input === "string") {
				return ["var", input];
			} else if(input === null || input === true || input === false || typeof input === "number") {
				return ["push", input];
			} else if(input.hasOwnProperty("q")) {
				return ["push", input.q];
			} else if(input.hasOwnProperty("ref")) {
				res = ["ref"];
				i = getOneAndOnlyField(input.ref);
				res.push({ "q": i });
				res.push(input.ref[i]);
				return walk(res, isTail);
			} else if(input.hasOwnProperty("cons")) {
				res = ["createObj"];
				for(i in input.cons) {
					if(input.cons.hasOwnProperty(i)) {
						res = res.concat(walk(input.cons[i]));
						res.push("addObj");
						res.push(i);
					}
				}
				return res;
			} else if(input.hasOwnProperty("begin")) {
				return outputBegin(input.begin, isTail);
			} else if(input.hasOwnProperty("function")) {
				res = outputBegin(input["function"].begin, true);
				func = funcs.putFunc(input["function"].args, input["function"].rest, res);
				return ["pushFunc", func, input["function"].name, input["function"].nameNew];
			} else if(input.hasOwnProperty("if")) {
				res = walk(input["if"].cond);
				resIf = walk(input["if"].then, isTail);
				if(input["if"]["else"]) {
					res.push("gotoElse");
					res.push(resIf.length + 2);
					res = res.concat(resIf);
					resElse = walk(input["if"]["else"], isTail);
					res.push("goto");
					res.push(resElse.length);
					res = res.concat(resElse);
				} else {
					res.push("gotoElse");
					res.push(resIf.length);
					res = res.concat(resIf);
					res.push("push");
					res.push(null);
				}
				return res;
			} else if(input.hasOwnProperty("cond")) {
				res = [];
				elseAddrs = [];
				for(i = 0; i < input.cond.length; i++) {
					res = res.concat(walk(input.cond[i]["case"]));
					resIf = walk(input.cond[i].then);
					res.push("gotoElse");
					res.push(resIf.length + (i < input.cond.length - 1 ? 2 : 0));
					res = res.concat(resIf);
					if(i < input.cond.length - 1) {
						res.push("gotoAbs");
						elseAddrs.push(res.length);
						res.push(null);
					}
				}
				for(i = 0; i < elseAddrs.length; i++) {
					res[elseAddrs[i]] = res.length;
				}
				return res;
			} else if(input.hasOwnProperty("define")) {
				res = [];
				for(i in input.define) {
					if(input.define.hasOwnProperty(i)) {
						res = res.concat(walk(input.define[i]));
						res.push("bind");
						res.push(i);
					}
				}
				res.push("push");
				res.push(null);
				return res;
			} else if(input.hasOwnProperty("set")) {
				res = [];
				for(i in input["set"]) {
					if(input["set"].hasOwnProperty(i)) {
						res = res.concat(walk(input["set"][i]));
						res.push("set");
						res.push(i);
					}
				}
				res.push("push");
				res.push(null);
				return res;
			} else if(input.hasOwnProperty("let")) {
				res = [];
				res.push({
					"function": {
						"args": (function(iLet) {
							var i,
								res = [];
							for(i in iLet.vars) {
								if(iLet.vars.hasOwnProperty(i)) {
									res.push(i);
								}
							}
							return res;
						})(input["let"]),
						"begin": input["let"].begin,
						"nameNew": input["let"].name
					}
				});
				for(i in input["let"].vars) {
					if(input["let"].vars.hasOwnProperty(i)) {
						res.push(input["let"].vars[i]);
					}
				}
				return walk(res, isTail);
			} else if(input.hasOwnProperty("letrec")) {
				res = ["saveEnv"];
				for(i in input.letrec.vars) {
					if(input.letrec.vars.hasOwnProperty(i)) {
						res = res.concat(walk(input.letrec.vars[i]));
						res.push("bind");
						res.push(i);
					}
				}
				res = res.concat(outputBegin(input.letrec.begin));
				res.push("restoreEnv");
				return res;
			} else if(input.hasOwnProperty("qq")) {
				return walk(walkqq(input.qq));
			} else if(input.hasOwnProperty("match")) {
				res = [];
				elseAddrs = [];
				resTarget = walk(input.match.target);
				for(i = 0; i < input.match.patterns.length; i++) {
					if(i > 0) {
						res.push("push");
						res.push(null);
						res.push("restoreEnv");
						res.push("pop");
					}
					res.push("saveEnv");
					res = res.concat(resTarget);
					res.push("match");
					res.push(input.match.patterns[i].pattern);
					resIf = outputBegin(input.match.patterns[i].begin, isTail);
					res.push("gotoElse");
					res.push(resIf.length + 3);
					res = res.concat(resIf);
					res.push("restoreEnv");
					res.push("gotoAbs");
					elseAddrs.push(res.length);
					res.push(null);
				}
				res.push("push");
				res.push(null);
				res.push("restoreEnv");
				for(i = 0; i < elseAddrs.length; i++) {
					res[elseAddrs[i]] = res.length;
				}
				return res;
			} else if(macroEnv !== null && input.hasOwnProperty("defmacro")) {
				macroEnv.bindMacro(input.defmacro.name, input.defmacro.patterns);
				return [];
			} else {
				i = getOneAndOnlyField(input);
				if(macroEnv && macroEnv.hasMacro(i)) {
					res = macroEnv.expand1(i, input[i]);
					return walk(res);
				} else {
					throw new Error("syntax error");
				}
			}
		}
		return walk(input, false);
	}
	function createFuncs() {
		var me,
			funcs = {},
			id = 1,
			instances = {},
			instanceId = 1;
		me = {
			putFunc(args, rest, code) {
				funcs[id] = {
					args: args,
					rest: rest,
					code: code
				}
				return id++;
			},
			createInstance(id, env, name) {
				instances[instanceId] = {
					args: funcs[id].args,
					rest: funcs[id].rest,
					code: funcs[id].code,
					env: env,
					name: name
				};
				return instanceId++;
			},
			getFunc(id) {
				return funcs[id];
			},
			getInstance(id) {
				return instances[id];
			}
		};
		return me;
	}
	function createEnv(parentEnv) {
		var me,
			vars = {};
		me = {
			find: function(name) {
				if(vars.hasOwnProperty("@" + name)) {
					return vars["@" + name];
				} else if(parentEnv) {
					return parentEnv.find(name);
				} else {
					throw new Error("variable is not bound: " + name);
				}
			},
			bind: function(name, val) {
				vars["@" + name] = val;
			},
			setVal: function(name, val) {
				if(vars.hasOwnProperty("@" + name)) {
					vars["@" + name] = val;
				} else if(parentEnv) {
					return parentEnv.setVal(name, val);
				} else {
					throw new Error("variable is not bound: " + name);
				}
			}
		};
		return me;
	}
	function execVM(initCode, environment, funcs) {
		var i,
			pc = 0,
			code = initCode,
			env = environment,
			stack = [],
			toPush,
			popped,
			callee,
			args,
			callfunc,
			envnew;
		function callBuiltin(callee, args) {
			var i;
			for(i = 0; i < args.length; i++) {
				if(args[i].type !== "literal") {
					throw new Error("invalid argument: type: " + args[i].type);
				}
				args[i] = args[i].val;
			}
			stack.push({ type: "literal", val: callee.val.apply(null, args) });
		}
		function setUserFunc(callee, envnew, callfunc) {
			var i;
			for(i = 0; i < callfunc.args.length; i++) {
				envnew.bind(callfunc.args[i], args[i]);
			}
			if(callfunc.rest) {
				envnew.bind(callfunc.rest, { type: "args", val: args.slice(i) });
			}
		}
		function callFuncNew(callee) {
			var callfunc = funcs.getInstance(callee.val),
				envnew = createEnv(callfunc.env);
			if(callfunc.name) {
				envnew.bind(callfunc.name, { type: "func", val: callee.val });
			}
			setUserFunc(callee, envnew, callfunc);
			stack.push({ type: "call", pc: pc + 1, env: env, envnew: envnew, code: code, callId: callee.val });
			pc = 0;
			code = callfunc.code;
			env = envnew;
		}
		function callArgs(isArgs) {
			if(args.length !== 1) {
				throw new Error("length of argument calling rest parameter must be 1");
			} else if(args[0].type !== "literal") {
				throw new Error("invalid message: type: " + args[0].type);
			} else if(typeof args[0].val === "number") {
				if(isArgs) {
					stack.push(callee.val[args[0].val]);
				} else {
					stack.push({ type: "literal", val: callee.val[args[0].val] });
				}
			} else if(args[0].val === "length") {
				stack.push({ type: "literal", val: callee.val[args[0].val] });
			} else {
				throw new Error("invalid message: " + args[0].val);
			}
		}
		function matchPattern(ptn, target) {
			var i;
			if(typeof ptn === "string") {
				env.bind(ptn, { type: "literal", val: target });
				return true;
			} else if(ptn !== null && typeof ptn === "object" && target !== null && typeof target === "object") {
				for(i in ptn) {
					if(ptn.hasOwnProperty(i)) {
						if(target[i] === undef || !matchPattern(ptn[i], target[i])) {
							return false;
						}
					}
				}
				return true;
			} else {
				return ptn === target;
			}
		}
		while(true) {
			while(pc < code.length) {
				switch(code[pc]) {
				case "push":
					stack.push({ type: "literal", val: code[pc + 1] });
					pc += 2;
					break;
				case "pushFunc":
					toPush = { type: "func", val: funcs.createInstance(code[pc + 1], env, code[pc + 3]) };
					stack.push(toPush);
					if(code[pc + 2]) {
						env.bind(code[pc + 2], toPush);
					}
					pc += 4;
					break;
				case "var":
					stack.push(env.find(code[pc + 1]));
					pc += 2;
					break;
				case "stopArgs":
					stack.push({ type: "stopArgs" });
					pc++;
					break;
				case "applyArgs":
					popped = stack.pop();
					if(popped.type !== "literal" || !isArray(popped.val)) {
						throw new Error("array required");
					}
					stack.push({ type: "stopArgs" });
					for(i = popped.val.length - 1; i >= 0; i--) {
						stack.push({ type: "literal", val: popped.val[i] });
					}
					pc++;
					break;
				case "createObj":
					stack.push({ type: "literal", val: {} });
					pc++;
					break;
				case "addObj":
					popped = stack.pop();
					if(stack[stack.length - 1].type !== "literal") {
						throw new Error("internal error");
					} else if(popped.type !== "literal") {
						throw new Error("cannot push value which is valid in JSON");
					}
					stack[stack.length - 1].val[code[pc + 1]] = popped.val;
					pc += 2;
					break;
				case "call":
					callee = stack.pop();
					for(args = []; (popped = stack.pop()).type !== "stopArgs";) {
						args.push(popped);
					}
					if(callee.type === "func") {
						callFuncNew(callee);
					} else if(callee.type === "builtin") {
						callBuiltin(callee, args);
						pc++;
					} else if(callee.type === "cont") {
						stack = callee.stack.slice();
						stack.push(args[0]);
						pc = 1000;
						code = callee.code;
						env = callee.env;
					} else if(callee.type === "args" || (callee.type === "literal" && typeof callee.val === "object" && callee.val !== null)) {
						callArgs(callee.type === "args");
						pc++;
					} else {
						throw new Error("cannot be applied: type:" + callee.type + " val:" + callee.val);
					}
					break;
				case "callTail":
					callee = stack.pop();
					for(args = []; (popped = stack.pop()).type !== "stopArgs";) {
						args.push(popped);
					}
					if(callee.type === "func") {
						for(i = stack.length - 1; i >= 0; i--) {
							if(stack[i].type === "call" && stack[i].callId === callee.val) {
								break;
							}
						}
						if(i > 0) {
							callfunc = funcs.getInstance(callee.val)
							stack.legnth = i + 1;
							envnew = stack[stack.length - 1].envnew;
							setUserFunc(callee, envnew, callfunc);
							pc = 0;
							code = callfunc.code;
							env = envnew;
						} else {
							callFuncNew(callee);
						}
					} else if(callee.type === "builtin") {
						callBuiltin(callee, args);
						pc++;
					} else if(callee.type === "cont") {
						stack = callee.stack.slice();
						stack.push(args[0]);
						pc = 1000;
						code = callee.code;
						env = callee.env;
					} else if(callee.type === "args" || (callee.type === "literal" && typeof callee.val === "object" && callee.val !== null)) {
						callArgs(callee.type === "args");
						pc++;
					} else {
						throw new Error("cannot be applied: type:" + callee.type + " val:" + callee.val);
					}
					break;
				case "pop":
					stack.pop();
					pc++;
					break;
				case "goto":
					pc += code[pc + 1] + 2;
					break;
				case "gotoAbs":
					pc = code[pc + 1];
					break;
				case "gotoElse":
					popped = stack.pop();
					if(popped.type === "literal" && !popped.val) {
						pc += code[pc + 1];
					}
					pc += 2;
					break;
				case "bind":
					env.bind(code[pc + 1], stack.pop());
					pc += 2;
					break;
				case "set":
					env.setVal(code[pc + 1], stack.pop());
					pc += 2;
					break;
				case "saveEnv":
					stack.push({ type: "saveEnv", env: env });
					env = createEnv(env);
					pc++;
					break;
				case "restoreEnv":
					popped = stack.pop();
					if(stack[stack.length - 1].type !== "saveEnv") {
						throw new Error("internal error");
					}
					env = stack[stack.length - 1].env;
					stack[stack.length - 1] = popped;
					pc++;
					break;
				case "pushCc":
					stack.push({
						type: "cont",
						code: code,
						env: env,
						stack: stack.slice(0, stack.length - 1)
					});
					pc++;
					break;
				case "match":
					popped = stack.pop();
					if(popped.type !== "literal") {
						throw new Error("simple objects can only match");
					}
					stack.push({ type: "literal", val: matchPattern(code[pc + 1], popped.val) });
					pc += 2;
					break;
				default:
					throw new Error("internal error:" + code[pc]);
				}
			}
			popped = stack.pop();
			if(stack[stack.length - 1] && stack[stack.length - 1].type === "call") {
				pc = stack[stack.length - 1].pc;
				env = stack[stack.length - 1].env;
				code = stack[stack.length - 1].code;
				stack.pop();
				stack.push(popped);
			} else {
				return popped;
			}
		}
	}
	function createGlobalEnv(funcs) {
		var genv = createEnv();
		function bindBuiltin(name, func) {
			var i;
			if(isArray(name)) {
				for(i = 0; i < name.length; i++) {
					genv.bind(name[i], { type: "builtin", val: func });
				}
			} else {
				genv.bind(name, { type: "builtin", val: func });
			}
		}
		bindBuiltin(["add", "+"], function() {
			var i,
				res = 0;
			for(i = 0; i < arguments.length; i++) {
				res += arguments[i];
			}
			return res;
		});
		bindBuiltin(["sub", "-"], function() {
			var i,
				res;
			if(arguments.length < 1) {
				throw new Error("too few arguments");
			} else if(arguments.length === 1) {
				return -arguments[0];
			} else {
				res = arguments[0];
				for(i = 1; i < arguments.length; i++) {
					res -= arguments[i];
				}
				return res;
			}
		});
		bindBuiltin(["mul", "*"], function() {
			var i,
				res = 1;
			for(i = 0; i < arguments.length; i++) {
				res *= arguments[i];
			}
			return res;
		});
		bindBuiltin(["div", "/"], function() {
			var i,
				res;
			if(arguments.length < 1) {
				throw new Error("too few arguments");
			} else if(arguments.length === 1) {
				return 1 / arguments[0];
			} else {
				res = arguments[0];
				for(i = 1; i < arguments.length; i++) {
					res /= arguments[i];
				}
				return res;
			}
		});
		bindBuiltin("eqv", function(a, b) { return a === b; });
		function compareFunc(f) {
			return function() {
				var i;
				for(i = 1; i < arguments.length; i++) {
					if(!f(arguments[i - 1], arguments[i])) {
						return false;
					}
				}
				return true;
			};
		}
		bindBuiltin("=", compareFunc(function(a, b) { return a === b; }));
		bindBuiltin("!=", compareFunc(function(a, b) { return a !== b; }));
		bindBuiltin("<", compareFunc(function(a, b) { return a < b; }));
		bindBuiltin("<=", compareFunc(function(a, b) { return a <= b; }));
		bindBuiltin(">", compareFunc(function(a, b) { return a > b; }));
		bindBuiltin(">=", compareFunc(function(a, b) { return a >= b; }));
		bindBuiltin(["not", "!"], function(a) { return !a; });
		bindBuiltin("sin", function(x) { return Math.sin(x); });
		bindBuiltin("cos", function(x) { return Math.cos(x); });
		bindBuiltin("tan", function(x) { return Math.tan(x); });
		bindBuiltin("asin", function(x) { return Math.asin(x); });
		bindBuiltin("acos", function(x) { return Math.acos(x); });
		bindBuiltin("atan", function(x) { return Math.atan(x); });
		bindBuiltin("exp", function(x) { return Math.exp(x); });
		bindBuiltin("expt", function(x, y) { return Math.pow(x, y); });
		bindBuiltin("log", function(x) { return Math.log(x); });
		bindBuiltin("list", function() { return Array.prototype.slice.call(arguments); });
		bindBuiltin("ref", function(name, val) { return val[name]; });
		bindBuiltin("numberp", function(x) { return typeof x === "number"; });
		bindBuiltin("integerp", function(x) { return isInteger(x); });
		bindBuiltin("floor", function(x) { return Math.floor(x); });
		bindBuiltin("ceiling", function(x) { return Math.ceil(x); });
		bindBuiltin("trancate", function(x) { return x < 0 ? Math.ceil(x) : Math.floor(x); });
		bindBuiltin("round", function(x) { return Math.round(x); });
		bindBuiltin("sqrt", function(x) { return Math.sqrt(x); });
		bindBuiltin("numbertostring", function(x, radix) { return x.toString(radix); });
		bindBuiltin("booleanp", function(x) { return typeof x === "boolean"; });
		bindBuiltin("keys", function(obj) {
			var res = [];
			for(i in obj) {
				if(obj.hasOwnProperty(i)) {
					res.push[i];
				}
			}
			return res;
		});
		bindBuiltin("length", function(obj) {
			return obj.length;
		});
		bindBuiltin("max", function() { return Math.max.apply(null, arguments); });
		bindBuiltin("min", function() { return Math.min.apply(null, arguments); });
		bindBuiltin("concat", function() {
			var i = 0,
				res = [];
			for(i = 0; i < arguments.length; i++) {
				res = res.concat(arguments[i]);
			}
			return res;
		});
		bindBuiltin("error", function(msg) { throw new Error(msg); });
		bindBuiltin("p", function(print) { console.log(print); return null; });
		genv.bind("callcc", {
			type: "func",
			val: funcs.createInstance(funcs.putFunc(["x"], null, [
				"stopArgs",
				"pushCc",
				"var",
				"x",
				"callTail"
			]))
		});
		genv.bind("apply", {
			type: "func",
			val: funcs.createInstance(funcs.putFunc(["f", "args"], null, [
				"var",
				"args",
				"applyArgs",
				"var",
				"f",
				"callTail"
			]))
		});
		execVM(traverse({
			"function": {
				"name": "arraymap",
				"args": ["f"],
				"rest": "args",
				"begin": [
					{
						"if": {
							"cond": ["eqv", 0, ["args", { "q": "length" }]],
							"then": ["error", { "q": "one or more argument reqired" }]
						}
					},
					{
						"let": {
							"vars": {
								"to": [
									"apply",
									"min",
									{
										"let": {
											"name": "loop1",
											"vars": {
												"i": 0
											},
											"begin": [
												{
													"if": {
														"cond": ["eqv", "i", ["args", { "q": "length" }]],
														"then": ["list"],
														"else": [
															"concat",
															["list", ["length", ["args", "i"]]],
															["loop1", ["add", "i", 1]]
														]
													}
												}
											]
										}
									}
								]
							},
							"begin": [
								{
									"let": {
										"name": "loop1",
										"vars": {
											"i": 0
										},
										"begin": [
											{
												"let": {
													"vars": {
														"applied": {
															"let": {
																"name": "loop2",
																"vars": {
																	"j": 0
																},
																"begin": [
																	{
																		"if": {
																			"cond": ["eqv", "j", ["args", { "q": "length" }]],
																			"then": ["list"],
																			"else": [
																				"concat",
																				["list", [["args", "j"], "i"]],
																				["loop2", ["add", "j", 1]]
																			]
																		}
																	}
																]
															}
														}
													},
													"begin": [
														{
															"if": {
																"cond": ["eqv", "i", "to"],
																"then": ["list"],
																"else": [
																	"concat",
																	[
																		"apply",
																		"f",
																		"applied"
																	],
																	["loop1", ["add", "i", 1]]
																]
															}
														}
													]
												}
											}
										]
									}
								}
							]
						}
					}
				]
			}
		}, funcs), genv, funcs);
		return genv;
	}
	function resultToString(val) {
		if(val.type === "literal") {
			return val.val;
		} else {
			return "#<" + val.type + ">";
		}
	}
	function evalLang(input) {
		var i,
			res,
			funcs = createFuncs(),
			genv = createGlobalEnv(funcs),
			macroEnv = createMacroEnv(funcs);
		function execTop(input) {
			var code;
			code = traverse(input, funcs, macroEnv);
			return execVM(code, genv, funcs);
		}
		if(isArray(input)) {
			for(i = 0; i < input.length; i++) {
				res = execTop(input[i]);
			}
			return resultToString(res);
		} else {
			return resultToString(execTop(input));
		}
	}
	var LangModule = {
		eval: evalLang
	};
	if(typeof module !== "undefined" && module.exports) {
		module.exports = LangModule;
	} else {
		root["Koume"] = LangModule;
	}
})(this);
