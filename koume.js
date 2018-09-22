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
	function traverse(input, funcs) {
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
		function walk(input, isTail) {
			var i,
				res,
				resIf,
				resElse,
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
				func = funcs.putFunc(input["function"].args, res);
				return ["pushFunc", func, input["function"].name, input["function"].nameNew];
			} else if(input.hasOwnProperty("if")) {
				res = [];
				res = res.concat(walk(input["if"].cond));
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
			} else {
				throw new Error("syntax error");
			}
		}
		return walk(input, false);
	}
	function createFuncs() {
		var me,
			funcs = {},
			id = 1;
		me = {
			putFunc(args, code) {
				funcs[id] = {
					args: args,
					code: code
				}
				return id++;
			},
			setEnv(id, env, name) {
				funcs[id].env = env;
				funcs[id].name = name;
			},
			getFunc(id) {
				return funcs[id];
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
					return { type: "literal", val: undef };
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
					throw new Error("invalid argument");
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
		}
		function callFuncNew(callee) {
			var envnew = createEnv(env),
				callfunc = funcs.getFunc(callee.val);
			if(callfunc.name) {
				envnew.bind(callfunc.name, { type: "func", val: callee.val });
			}
			setUserFunc(callee, envnew, callfunc);
			stack.push({ type: "call", pc: pc + 1, env: env, code: code, callId: callee.val });
			pc = 0;
			code = callfunc.code;
			env = envnew;
		}
		while(true) {
			while(pc < code.length) {
				switch(code[pc]) {
				case "push":
					stack.push({ type: "literal", val: code[pc + 1] });
					pc += 2;
					break;
				case "pushFunc":
					funcs.setEnv(code[pc + 1], env, code[pc + 3]);
					toPush = { type: "func", val: code[pc + 1] };
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
					} else {
						throw new Error("cannot be applied");
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
							callfunc = funcs.getFunc(callee.val)
							stack.legnth = i + 1;
							envnew = createEnv(stack[stack.length - 1].env)
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
					} else {
						throw new Error("cannot be applied");
					}
					break;
				case "pop":
					stack.pop();
					pc++;
					break;
				case "goto":
					pc += code[pc + 1] + 2;
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
			genv.bind(name, { type: "builtin", val: func });
		}
		bindBuiltin("add", function(a, b) { return a + b; });
		bindBuiltin("sub", function(a, b) { return a - b; });
		bindBuiltin("eqv", function(a, b) { return a === b; });
		bindBuiltin("list", function() { return Array.prototype.slice.call(arguments); });
		bindBuiltin("ref", function(name, val) { return val[name]; });
		genv.bind("callcc", {
			type: "func",
			val: funcs.putFunc(["x"], [
				"stopArgs",
				"pushCc",
				"var",
				"x",
				"callTail"
			])
		});
		return genv;
	}
	function evalLang(input) {
		var i,
			res,
			funcs = createFuncs(),
			genv = createGlobalEnv(funcs);
		function execTop(input) {
			var code;
			code = traverse(input, funcs);
			return execVM(code, genv, funcs);
		}
		if(isArray(input)) {
			for(i = 0; i < input.length; i++) {
				res = execTop(input[i]);
			}
			return res.val;
		} else {
			return execTop(input).val;
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
