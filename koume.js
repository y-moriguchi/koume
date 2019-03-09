/*
 * Koume
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
(function(root) {
    var undef = void 0,
        nan = parseInt('Hello', 2),
        gensymId = 1;

    function gensym() {
        return (function() {
            var id = gensymId++;
            return function(message) {
                switch(message) {
                case "type":  return "symbol";
                case "id":    return id;
                default:      return undef;
                }
            };
        })();
    }

    function isArray(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    }

    function isInteger(x) {
        return typeof x === "number" && isFinite(x) && Math.floor(x) === x;
    }

    function tranc(x) {
        return x < 0 ? Math.ceil(x) : Math.floor(x);
    }

    function sign(x) {
        x = +x;
        if(x === 0 || isNaN(x)) {
            return x;
        }
        return x > 0 ? 1 : -1;
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
                    throw new Error("macro cannot be expanded");
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

        function walkqqProto(input, list, cons) {
            var i,
                res,
                resq,
                uq;
            if(isArray(input)) {
                for(i = 0, res = [list]; i < input.length; i++) {
                    res.push(walkqqProto(input[i], list, cons));
                }
                return res;
            } else if(typeof input === "object" && input !== null) {
                if((uq = getValueOfOneAndOnlyField(input, "uq")) !== undef) {
                    return uq;
                } else {
                    res = {};
                    for(i in input) {
                        if(input.hasOwnProperty(i)) {
                            res[i] = walkqqProto(input[i], list, cons);
                        }
                    }
                    resq = {};
                    resq[cons] = res;
                    return resq;
                }
            } else {
                return { "q": input };
            }
        }

        function walkqq(input) {
            return walkqqProto(input, "list", "cons");
        }

        function walktq(input) {
            return walkqqProto(input, "values", "tuple");
        }

        function walk(input, isTail) {
            var i,
                res,
                resIf,
                resElse,
                resTarget,
                lIndex,
                varRe,
                matched,
                props,
                resProp,
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
            } else if(typeof input === "function" && input("type") === "symbol") {
                return ["var", input];
            } else if(input === null || input === true || input === false || typeof input === "number") {
                return ["push", input];
            } else if(input.hasOwnProperty("q")) {
                return ["push", input.q];
            } else if(input.hasOwnProperty("cons")) {
                if(input.cons === null || typeof input.cons !== "object") {
                    throw new Error("cons clause must be an object");
                }
                res = ["createObj"];
                for(i in input.cons) {
                    if(input.cons.hasOwnProperty(i)) {
                        res = res.concat(walk(input.cons[i]));
                        res.push("addObj");
                        res.push(i);
                    }
                }
                return res;
            } else if(input.hasOwnProperty("tuple")) {
                if(input.tuple === null || typeof input.tuple !== "object") {
                    throw new Error("tuple clause must be an object");
                }
                res = ["createTuple"];
                for(i in input.tuple) {
                    if(input.tuple.hasOwnProperty(i)) {
                        res = res.concat(walk(input.tuple[i]));
                        res.push("addTuple");
                        res.push(i);
                    }
                }
                return res;
            } else if(input.hasOwnProperty("begin")) {
                if(!isArray(input.begin)) {
                    throw new Error("begin clause must be an array");
                }
                return outputBegin(input.begin, isTail);
            } else if(input.hasOwnProperty("function")) {
                if(input["function"].begin === undef) {
                    throw new Error("body of function required");
                } else if(!isArray(input["function"].begin)) {
                    throw new Error("body of function must be an array");
                } else if(input["function"].begin.length === 0) {
                    throw new Error("body of function must not be empty");
                } else if(input["function"].args === undef) {
                    throw new Error("arguments of function required");
                } else if(!isArray(input["function"].args)) {
                    throw new Error("arguments of function must be an array");
                } else if(!(function(args) {
                            var i;
                            for(i = 0; i < args.length; i++) {
                                if(!(typeof args[i] === "string" ||
                                        (typeof args[i] === "function" && args[i]("type") === "symbol"))) {
                                    return false;
                                }
                            }
                            return true;
                        })(input["function"].args)) {
                    throw new Error("argument must be a string");
                }
                res = outputBegin(input["function"].begin, true);
                func = funcs.putFunc(input["function"].args, input["function"].rest, res);
                return ["pushFunc", func, input["function"].name, input["function"].nameNew];
            } else if(input.hasOwnProperty("if")) {
                if(input["if"].cond === undef) {
                    throw new Error("condition required");
                } else if(input["if"].then === undef) {
                    throw new Error("then clause required");
                }
                res = walk(input["if"].cond);
                resIf = walk(input["if"].then, isTail);
                if(input["if"]["else"] !== undef) {
                    res.push("gotoElse");
                    res.push(resIf.length + 2);
                    res = res.concat(resIf);
                    resElse = walk(input["if"]["else"], isTail);
                    res.push("goto");
                    res.push(resElse.length);
                    res = res.concat(resElse);
                } else {
                    res.push("gotoElse");
                    res.push(resIf.length + 2);
                    res = res.concat(resIf);
                    res.push("goto");
                    res.push(2);
                    res.push("push");
                    res.push(null);
                }
                return res;
            } else if(input.hasOwnProperty("cond")) {
                if(!isArray(input.cond)) {
                    throw new Error("cond clause must be array");
                } else if(input.cond.length === 0) {
                    throw new Error("cond clause must have more then one clause");
                }
                res = [];
                elseAddrs = [];
                for(i = 0; i < input.cond.length; i++) {
                    if(input.cond[i]["case"] === undef) {
                        throw new Error("case required");
                    } else if(input.cond[i].then === undef) {
                        throw new Error("then clause required");
                    }
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
                if(input.define === null || typeof input.define !== "object") {
                    throw new Error("define clause must be an object");
                }
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
                if(input["set"] === null || typeof input["set"] !== "object") {
                    throw new Error("set clause must be an object");
                }
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
                if(input["let"].begin === undef) {
                    throw new Error("body of let required");
                } else if(!isArray(input["let"].begin)) {
                    throw new Error("body of let must be an array");
                } else if(input["let"].begin.length === 0) {
                    throw new Error("body of let must not be empty");
                } else if(input["let"].vars === undef) {
                    throw new Error("variables required");
                } else if(input["let"].vars === null || typeof input["let"].vars !== "object") {
                    throw new Error("variables must be an object");
                }
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
                if(input.letrec.begin === undef) {
                    throw new Error("body of letrec required");
                } else if(!isArray(input.letrec.begin)) {
                    throw new Error("body of letrec must be an array");
                } else if(input.letrec.begin.length === 0) {
                    throw new Error("body of letrec must not be empty");
                } else if(input.letrec.vars === undef) {
                    throw new Error("variables required");
                } else if(input.letrec.vars === null || typeof input.letrec.vars !== "object") {
                    throw new Error("variables must be an object");
                }
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
            } else if(input.hasOwnProperty("tq")) {
                return walk(walktq(input.tq));
            } else if(input.hasOwnProperty("match")) {
                if(input.match.target === undef) {
                    throw new Error("target of match required");
                } else if(input.match.patterns === undef) {
                    throw new Error("patterns of match required");
                } else if(!isArray(input.match.patterns)) {
                    throw new Error("patterns of match must be an array");
                } else if(input.match.patterns.length === 0) {
                    throw new Error("patterns of match must not be empty");
                }
                res = [];
                elseAddrs = [];
                resTarget = walk(input.match.target);
                for(i = 0; i < input.match.patterns.length; i++) {
                    if(input.match.patterns[i].pattern === undef) {
                        throw new Error("pattern required");
                    } else if(input.match.patterns[i].begin === undef) {
                        throw new Error("instructions required");
                    } else if(!isArray(input.match.patterns[i].begin)) {
                        throw new Error("instructions must be an array");
                    } else if(input.match.patterns[i].begin.length === 0) {
                        throw new Error("instructions must not be empty");
                    }
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
            } else if(input.hasOwnProperty("sq")) {
                if(typeof input.sq !== "string") {
                    throw new Error("string literal required: " + input.sq);
                }
                res = ["stringAppend"];
                lIndex = 0;
                varRe = /\$(?:\{([^\}]+)\}|([^ \t\n]+))/g;
                while(!!(matched = varRe.exec(input.sq))) {
                    if(lIndex < matched.index) {
                        res.push({ q: input.sq.substring(lIndex, matched.index) });
                    }
                    props = (matched[1] ? matched[1] : matched[2]).split(".");
                    resProp = props[0];
                    for(i = 1; i < props.length; i++) {
                        resProp = [resProp, { q: props[i] }];
                    }
                    res.push(["toString", resProp]);
                    lIndex = varRe.lastIndex;
                }
                if(lIndex < input.sq.length) {
                    res.push({ q: input.sq.substring(lIndex, input.sq.length) });
                }
                return walk(res);
            } else if(input.hasOwnProperty("delay")) {
                res = ["pushDelay", walk(input.delay)];
                return res;
            } else if(macroEnv !== null && input.hasOwnProperty("defmacro")) {
                if(input.defmacro.name === undef) {
                    throw new Error("name of macro required");
                } else if(input.defmacro.patterns === undef) {
                    throw new Error("patterns of macro required");
                } else if(!isArray(input.defmacro.patterns)) {
                    throw new Error("patterns of macro must be an array");
                } else if(input.defmacro.patterns.length === 0) {
                    throw new Error("patterns of macro must not be empty");
                }
                macroEnv.bindMacro(input.defmacro.name, input.defmacro.patterns);
                return [];
            } else {
                i = getOneAndOnlyField(input);
                if(macroEnv && macroEnv.hasMacro(i)) {
                    res = macroEnv.expand1(i, input[i]);
                    return walk(res);
                } else {
                    throw new Error("syntax error: " + i);
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
                if(typeof name === "string" && vars.hasOwnProperty("@" + name)) {
                    return vars["@" + name];
                } else if(typeof name === "function" && name("type") === "symbol" && vars.hasOwnProperty("#" + name("id"))) {
                    return vars["#" + name("id")];
                } else if(parentEnv) {
                    return parentEnv.find(name);
                } else {
                    throw new Error("variable is not bound: " + name);
                }
            },

            bind: function(name, val) {
                if(typeof name === "string") {
                    vars["@" + name] = val;
                } else if(typeof name === "function" && name("type") === "symbol") {
                    vars["#" + name("id")] = val;
                } else {
                    throw new Error("internal error:" + name);
                }
            },

            setVal: function(name, val) {
                if(typeof name === "string" && vars.hasOwnProperty("@" + name)) {
                    vars["@" + name] = val;
                } else if(typeof name === "function" && name("type") === "symbol" && vars.hasOwnProperty("#" + name("id"))) {
                    vars["#" + name("id")] = val;
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

        function callBuiltinValues(callee, args) {
            stack.push(callee.val.apply(null, args));
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

        function callArgs(argsType) {
            if(args.length !== 1) {
                throw new Error("length of argument calling rest parameter must be 1");
            } else if(args[0].type !== "literal") {
                throw new Error("invalid message: type: " + args[0].type);
            } else if(args[0].val === "length") {
                stack.push({ type: "literal", val: callee.val[args[0].val] });
            } else if(argsType === "args" && typeof args[0].val === "number") {
                if(callee.val[args[0].val] === undef) {
                    stack.push({ type: "literal", val: undef });
                } else {
                    stack.push(callee.val[args[0].val]);
                }
            } else if(argsType === "tuple" && callee.val.hasOwnProperty(args[0].val)) {
                stack.push(callee.val[args[0].val]);
            } else if(argsType === "literal" &&
                    typeof callee.val === "string" &&
                    typeof args[0].val === "number" &&
                    args[0].val >= 0 &&
                    args[0].val < callee.val.length) {
                stack.push({ type: "literal", val: callee.val.charAt(args[0].val) });
            } else if(argsType === "literal" && callee.val.hasOwnProperty(args[0].val)) {
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
                    if(popped.type === "literal" && isArray(popped.val)) {
                        stack.push({ type: "stopArgs" });
                        for(i = popped.val.length - 1; i >= 0; i--) {
                            stack.push({ type: "literal", val: popped.val[i] });
                        }
                    } else if(popped.type === "args") {
                        stack.push({ type: "stopArgs" });
                        for(i = popped.val.length - 1; i >= 0; i--) {
                            stack.push(popped.val[i]);
                        }
                    } else {
                        throw new Error("array required");
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

                case "createTuple":
                    stack.push({ type: "tuple", val: {} });
                    pc++;
                    break;

                case "addTuple":
                    popped = stack.pop();
                    stack[stack.length - 1].val[code[pc + 1]] = popped;
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
                    } else if(callee.type === "builtinvalues") {
                        callBuiltinValues(callee, args);
                        pc++;
                    } else if(callee.type === "cont") {
                        stack = callee.stack.slice();
                        stack.push(args[0]);
                        pc = 1000;
                        code = callee.code;
                        env = callee.env;
                    } else if(callee.type === "args" ||
                            callee.type === "tuple" ||
                            (callee.type === "literal" && typeof callee.val === "object" && callee.val !== null) ||
                            (callee.type === "literal" && typeof callee.val === "string")) {
                        callArgs(callee.type);
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
                    } else if(callee.type === "builtinvalues") {
                        callBuiltinValues(callee, args);
                        pc++;
                    } else if(callee.type === "cont") {
                        stack = callee.stack.slice();
                        stack.push(args[0]);
                        pc = 1000;
                        code = callee.code;
                        env = callee.env;
                    } else if(callee.type === "args" ||
                             callee.type === "tuple" ||
                             (callee.type === "literal" && typeof callee.val === "object" && callee.val !== null)) {
                        callArgs(callee.type);
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
                    if(popped.type === "literal" && popped.val === false) {
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

                case "pushDelay":
                    stack.push({
                        type: "delay",
                        code: code[pc + 1]
                    });
                    pc += 2;
                    break;

                case "force":
                    popped = stack.pop();
                    if(popped.type !== "delay") {
                        throw new Error("promise required");
                    } else if(popped.memo === undef) {
                        stack.push({
                            type: "call",
                            pc: pc + 1,
                            env: env,
                            code: code,
                            memo: popped
                        });
                        pc = 0;
                        env = createEnv(env);
                        code = popped.code;
                    } else {
                        stack.push(popped.memo);
                        pc++;
                    }
                    break;

                case "gensym":
                    stack.push({ type: "literal", val: gensym() });
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
                if(stack[stack.length - 1].memo !== undef) {
                    stack[stack.length - 1].memo.memo = popped;
                }
                stack.pop();
                stack.push(popped);
            } else {
                return popped;
            }
        }
    }

    function checkNumber(x) {
        if(typeof x !== "number") {
            throw new Error("number required: " + x);
        }
    }

    function checkInteger(x) {
        if(!isInteger(x)) {
            throw new Error("integer required: " + x);
        }
    }

    function checkNonnegativeInteger(x) {
        if(!isInteger(x) || x < 0) {
            throw new Error("nonnegative integer required: " + x);
        }
    }

    function checkString(x) {
        if(typeof x !== "string") {
            throw new Error("string required: " + x);
        }
    }

    function checkArray(x) {
        if(!isArray(x)) {
            throw new Error("array required: " + x);
        }
    }

    function checkObject(x) {
        if(typeof x !== "object" || x === null) {
            throw new Error("object required: " + x);
        }
    }

    function createGlobalEnv(funcs, bindBuildinCallback) {
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

        function bindBuiltinValues(name, func) {
            var i;
            if(isArray(name)) {
                for(i = 0; i < name.length; i++) {
                    genv.bind(name[i], { type: "builtinvalues", val: func });
                }
            } else {
                genv.bind(name, { type: "builtinvalues", val: func });
            }
        }

        bindBuiltin(["add", "+"], function() {
            var i,
                res = 0;
            for(i = 0; i < arguments.length; i++) {
                checkNumber(arguments[i]);
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
                checkNumber(arguments[0]);
                return -arguments[0];
            } else {
                checkNumber(arguments[0]);
                res = arguments[0];
                for(i = 1; i < arguments.length; i++) {
                    checkNumber(arguments[i]);
                    res -= arguments[i];
                }
                return res;
            }
        });

        bindBuiltin(["mul", "*"], function() {
            var i,
                res = 1;
            for(i = 0; i < arguments.length; i++) {
                checkNumber(arguments[i]);
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
                checkNumber(arguments[0]);
                return 1 / arguments[0];
            } else {
                checkNumber(arguments[0]);
                res = arguments[0];
                for(i = 1; i < arguments.length; i++) {
                    checkNumber(arguments[0]);
                    res /= arguments[i];
                }
                return res;
            }
        });

        bindBuiltin("quotient", function(a, b) {
            checkInteger(a);
            checkInteger(b);
            return tranc(a / b);
        });

        bindBuiltin("remainder", function(a, b) {
            checkInteger(a);
            checkInteger(b);
            return a % b;
        });

        bindBuiltin("modulo", function(a, b) {
            var sgn = sign(a) * sign(b);
            checkInteger(a);
            checkInteger(b);
            return sgn < 0 ? b + a % b : a % b;
        });

        bindBuiltin("eqv", function(a, b) { return a === b; });

        function compareFunc(f, checkf) {
            return function() {
                var i,
                    before = null;
                for(i = 0; i < arguments.length; i++) {
                    checkf(arguments[i]);
                    if(before !== null && !f(before, arguments[i])) {
                        return false;
                    }
                    before = arguments[i];
                }
                return true;
            };
        }

        function checkAndExecute(arity, execf, checkf) {
            return function(x) {
                var i,
                    args = Array.prototype.slice.call(arguments);
                if(arity >= 0 && args.length !== arity) {
                    throw new Error("arity of arguments must be " + arity);
                }
                for(i = 0; i < args.length; i++) {
                    checkf(args[i]);
                }
                return execf.apply(null, args);
            };
        }

        bindBuiltin("=", compareFunc(function(a, b) { return a === b; }, checkNumber));
        bindBuiltin("!=", compareFunc(function(a, b) { return a !== b; }, checkNumber));
        bindBuiltin("<", compareFunc(function(a, b) { return a < b; }, checkNumber));
        bindBuiltin("<=", compareFunc(function(a, b) { return a <= b; }, checkNumber));
        bindBuiltin(">", compareFunc(function(a, b) { return a > b; }, checkNumber));
        bindBuiltin(">=", compareFunc(function(a, b) { return a >= b; }, checkNumber));
        bindBuiltin(["not", "!"], function(a) { return a === false ? true : false; });
        bindBuiltin("sin", checkAndExecute(1, Math.sin, checkNumber));
        bindBuiltin("cos", checkAndExecute(1, Math.cos, checkNumber));
        bindBuiltin("tan", checkAndExecute(1, Math.tan, checkNumber));
        bindBuiltin("asin", checkAndExecute(1, Math.asin, checkNumber));
        bindBuiltin("acos", checkAndExecute(1, Math.acos, checkNumber));
        bindBuiltin("atan", checkAndExecute(1, Math.atan, checkNumber));
        bindBuiltin("exp", checkAndExecute(1, Math.exp, checkNumber));
        bindBuiltin("expt", checkAndExecute(2, Math.pow, checkNumber));
        bindBuiltin("log", checkAndExecute(1, Math.log, checkNumber));
        bindBuiltin("list", function() { return Array.prototype.slice.call(arguments); });

        bindBuiltin("first", function(list) {
            checkArray(list);
            if(list.length > 0) {
                return list[0];
            } else {
                throw new Error("empty array");
            }
        });

        bindBuiltin("rest", function(list) {
            checkArray(list);
            if(list.length > 0) {
                return list.slice(1);
            } else {
                throw new Error("empty array");
            }
        });

        bindBuiltin("setprop", function(name, obj, val) {
            checkString(name);
            checkObject(obj);
            return obj[name] = val;
        });

        bindBuiltin("numberp", function(x) { return typeof x === "number"; });

        bindBuiltinValues("numberp", function(obj) {
            return {
                "type": "literal",
                "val": obj.type === "literal" && typeof obj.val === "number"
            };
        });

        bindBuiltinValues("integerp", function(obj) {
            return {
                "type": "literal",
                "val": obj.type === "literal" && isInteger(obj.val)
            };
        });

        bindBuiltin("floor", checkAndExecute(1, Math.floor, checkNumber));
        bindBuiltin("ceiling", checkAndExecute(1, Math.ceil, checkNumber));
        bindBuiltin("trancate", checkAndExecute(1, tranc, checkNumber));
        bindBuiltin("round", checkAndExecute(1, Math.round, checkNumber));
        bindBuiltin("sqrt", checkAndExecute(1, Math.sqrt, checkNumber));

        bindBuiltin("numberToString", function(x, radix) {
            checkNumber(x);
            if(radix === undef) {
                return x.toString(10);
            } else {
                checkInteger(radix);
                if(radix < 2 || radix > 36) {
                    throw new Error("radix must be between 2 and 36: " + radix);
                }
                return x.toString(radix);
            }
        });

        bindBuiltin("stringToNumber", function(x) {
            checkString(x);
            return parseFloat(x);
        });

        bindBuiltin("stringToInteger", function(x, radix) {
            function makeRadix(radix) {
                if(radix === undef) {
                    return makeRadix(10);
                } else if(typeof radix !== "number" || radix < 2) {
                    throw new Error("radix must be between 2 and 36: " + radix);
                } else if(radix <= 10) {
                    return "[0-" + String.fromCharCode(48 + radix - 1) + "]";
                } else if(radix <= 36) {
                    return "[0-9A-" + String.fromCharCode(65 + radix - 11) + "a-" + String.fromCharCode(97 + radix - 11) + "]";
                } else {
                    throw new Error("radix must be between 2 and 36: " + radix);
                }
            }
            var regexString;
            checkString(x);
            regexString = "^(\\-|\\+)?(" + makeRadix(radix) + "+|Infinity)$";
            if(new RegExp(regexString).test(x)) {
                return parseInt(x, radix);
            } else {
                return nan;
            }
        });

        bindBuiltinValues("booleanp", function(obj) {
            return {
                "type": "literal",
                "val": obj.type === "literal" && typeof obj.val === "boolean"
            };
        });

        bindBuiltinValues("nullp", function(obj) {
            return {
                "type": "literal",
                "val": obj.type === "literal" && obj.val === null
            };
        });

        bindBuiltinValues("arrayp", function(obj) {
            return {
                "type": "literal",
                "val": obj.type === "literal" && isArray(obj.val)
            };
        });

        bindBuiltinValues("objectp", function(obj) {
            return {
                "type": "literal",
                "val": obj.type === "literal" && obj.val !== null && typeof obj.val === "object"
            };
        });

        bindBuiltin("keys", function(obj) {
            var res = [];
            checkObject(obj);
            for(i in obj) {
                if(obj.hasOwnProperty(i)) {
                    res.push(i);
                }
            }
            return res;
        });

        bindBuiltin("equal", function(obj1, obj2) {
            function isEqual(obj1, obj2) {
                var i;
                if(isArray(obj1) && isArray(obj2)) {
                    if(obj1.length !== obj2.length) {
                        return false;
                    }
                    for(i = 0; i < obj1.length; i++) {
                        if(!isEqual(obj1[i], obj2[i])) {
                            return false;
                        }
                    }
                    return true;
                } else if(typeof obj1 === "object" && obj1 !== null && typeof obj2 === "object" && obj2 !== null) {
                    for(i in obj1) {
                        if(obj1.hasOwnProperty(i)) {
                            if(obj2[i] === undef || !isEqual(obj1[i], obj2[i])) {
                                return false;
                            }
                        }
                    }
                    for(i in obj2) {
                        if(obj2.hasOwnProperty(i)) {
                            if(obj1[i] === undef) {
                                return false;
                            }
                        }
                    }
                    return true;
                } else {
                    return obj1 === obj2;
                }
            }
            return isEqual(obj1, obj2);
        });

        bindBuiltin("length", function(obj) {
            if(typeof obj !== "string" && !isArray(obj)) {
                throw new Error("object must have length");
            }
            return obj.length;
        });

        bindBuiltin("max", checkAndExecute(-1, Math.max, checkNumber));
        bindBuiltin("min", checkAndExecute(-1, Math.min, checkNumber));

        bindBuiltin("stringAppend", function() {
            var i,
                res = "";
            for(i = 0; i < arguments.length; i++) {
                checkString(arguments[i]);
                res += arguments[i];
            }
            return res;
        });

        bindBuiltin("string=", compareFunc(function(a, b) { return a === b; }, checkString));
        bindBuiltin("stringci=", compareFunc(function(a, b) {
            return a.toUpperCase() === b.toUpperCase();
        }, checkString));
        bindBuiltin("string!=", compareFunc(function(a, b) { return a !== b; }, checkString));
        bindBuiltin("stringci!=", compareFunc(function(a, b) {
            return a.toUpperCase() !== b.toUpperCase();
        }, checkString));
        bindBuiltin("string<", compareFunc(function(a, b) { return a < b; }, checkString));
        bindBuiltin("string<=", compareFunc(function(a, b) { return a <= b; }, checkString));
        bindBuiltin("string>", compareFunc(function(a, b) { return a > b; }, checkString));
        bindBuiltin("string>=", compareFunc(function(a, b) { return a >= b; }, checkString));

        bindBuiltin("stringci<", compareFunc(function(a, b) {
            return a.toUpperCase() < b.toUpperCase();
        }, checkString));
        bindBuiltin("stringci<=", compareFunc(function(a, b) {
            return a.toUpperCase() <= b.toUpperCase();
        }, checkString));
        bindBuiltin("stringci>", compareFunc(function(a, b) {
            return a.toUpperCase() > b.toUpperCase();
        }, checkString));
        bindBuiltin("stringci>=", compareFunc(function(a, b) {
            return a.toUpperCase() >= b.toUpperCase();
        }, checkString));

        bindBuiltin("substring", function(str, start, end) {
            checkString(str);
            checkNonnegativeInteger(start);
            checkNonnegativeInteger(end);
            if(start > end) {
                throw new Error("start position must not be greater than end position");
            }
            return str.substring(start, end);
        });

        bindBuiltin("concat", function() {
            var i = 0,
                res = [];
            for(i = 0; i < arguments.length; i++) {
                checkArray(arguments[i]);
                res = res.concat(arguments[i]);
            }
            return res;
        });

        bindBuiltin("error", function(msg) {
            checkString(msg);
            throw new Error(msg);
        });

        bindBuiltin("listToObject", function(aList) {
            var result = {},
                i;
            for(i = 0; i < aList.length; i += 2) {
                result[aList[i]] = aList[i + 1];
            }
            return result;
        });

        bindBuiltinValues("toString", function(x) {
            return {
                "type": "literal",
                "val": valueToString(x)
            };
        });

        bindBuiltinValues("functionp", function(obj) {
            return {
                "type": "literal",
                "val": obj.type === "func" || obj.type === "builtin" || obj.type === "builtinvalues" || obj.type === "cont"
            };
        });

        bindBuiltinValues("values", function() {
            return {
                "type": "args",
                "val": Array.prototype.slice.call(arguments)
            };
        });

        bindBuiltinValues("concatValues", function() {
            var i,
                result = [];
            for(i = 0; i < arguments.length; i++) {
                if(typeof arguments[i] !== "object" || arguments[i] === null || arguments[i].type !== "args") {
                    throw new Error("values required");
                }
                result = result.concat(arguments[i].val);
            }
            return {
                "type": "args",
                "val": result
            };
        });

        bindBuiltinValues("arrayToValues", function(anArray) {
            var i,
                result = [];
            if(typeof anArray !== "object" || anArray == null || anArray.type !== "literal" || !isArray(anArray.val)) {
                throw new Error("array required");
            }
            for(i = 0; i < anArray.val.length; i++) {
                result.push({
                    "type": "literal",
                    "val": anArray.val[i]
                });
            }
            return {
                "type": "args",
                "val": result
            };
        });

        bindBuiltinValues("p", function(print) {
            console.log(resultToString(print));
            return {
                "type": "literal",
                "val": null
            };
        });

        genv.bind("callcc", {
            type: "func",
            val: funcs.createInstance(funcs.putFunc(["x"], null, [
                "stopArgs",
                "var",
                "x",
                "var",
                "functionp",
                "call",
                "gotoElse",
                7,
                "stopArgs",
                "pushCc",
                "var",
                "x",
                "callTail",
                "goto",
                6,
                "stopArgs",
                "push",
                "function required",
                "var",
                "error",
                "call"
            ]), genv)
        });

        genv.bind("apply", {
            type: "func",
            val: funcs.createInstance(funcs.putFunc(["f", "args"], null, [
                "stopArgs",
                "var",
                "f",
                "var",
                "functionp",
                "call",
                "gotoElse",
                8,
                "var",
                "args",
                "applyArgs",
                "var",
                "f",
                "callTail",
                "goto",
                6,
                "stopArgs",
                "push",
                "function required",
                "var",
                "error",
                "call",
            ]), genv)
        });

        genv.bind("force", {
            type: "func",
            val: (function() {
                var sym = gensym();
                return funcs.createInstance(funcs.putFunc([sym], null, [
                    "var",
                    sym,
                    "force"
                ]), genv)
            })()
        });

        genv.bind("gensym", {
            type: "func",
            val: funcs.createInstance(funcs.putFunc([], null, [
                "gensym"
            ]), genv)
        });

        execVM(traverse({
            "function": {
                "name": "arraymap",
                "args": ["f"],
                "rest": "args",
                "begin": [
                    {
                        "if": {
                            "cond": ["not", ["functionp", "f"]],
                            "then": ["error", { "q": "function required" }]
                        }
                    },
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
                                                        "cond": {
                                                            "if": {
                                                                "cond": ["<", "i", ["args", { "q": "length" }]],
                                                                "then": ["not", ["arrayp", ["args", "i"]]],
                                                                "else": false
                                                            }
                                                        },
                                                        "then": ["error", { "q": "function required" }]
                                                    }
                                                },
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
                                                                            "cond": {
                                                                                "if": {
                                                                                    "cond": ["eqv", "i", "to"],
                                                                                    "then": true,
                                                                                    "else": ["eqv", "j", ["args", { "q": "length" }]]
                                                                                }
                                                                            },
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
                                                                    ["list", ["apply", "f", "applied"]],
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

        execVM(traverse({
            "function": {
                "name": "objectmap",
                "args": ["f", "obj"],
                "begin": [
                    {
                        "define": {
                            "res": {
                                "cons": {}
                            },
                            "keylist": ["keys", "obj"]
                        }
                    },
                    {
                        "if": {
                            "cond": ["not", ["functionp", "f"]],
                            "then": ["error", { "q": "function required" }]
                        }
                    },
                    {
                        "if": {
                            "cond": ["not", ["objectp", "obj"]],
                            "then": ["error", { "q": "object required" }]
                        }
                    },
                    {
                        "let": {
                            "name": "loop",
                            "vars": {
                                "i": 0
                            },
                            "begin": [
                                {
                                    "if": {
                                        "cond": ["<", "i", ["keylist", { "q": "length" }]],
                                        "then": {
                                            "begin": [
                                                ["setprop",
                                                    ["keylist", "i"],
                                                    "res",
                                                    ["apply", "f", ["list", ["obj", ["keylist", "i"]]]]
                                                ],
                                                ["loop", ["add", "i", 1]]
                                            ]
                                        },
                                        "else": "res"
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }, funcs), genv, funcs);

        if(bindBuildinCallback) {
            bindBuildinCallback(bindBuildin);
        }
        return genv;
    }

    function resultToString(val) {
        if(val.type === "literal") {
            return val.val;
        } else {
            return "#<" + val.type + ">";
        }
    }

    function valueToString(val) {
        if(val.type === "literal") {
            return JSON.stringify(val.val);
        } else {
            return "#<" + val.type + ">";
        }
    }

    function evalLang(input, envs, initBuiltin) {
        var i,
            res,
            funcs = envs ? envs.funcs : createFuncs(),
            genv = envs ? envs.genv : createGlobalEnv(funcs, initBuiltin),
            macroEnv = envs ? envs.macroEnv : createMacroEnv(funcs);
        function execTop(input) {
            var code;
            code = traverse(input, funcs, macroEnv);
            return execVM(code, genv, funcs);
        }
        function initMacro() {
            execTop({
                "defmacro": {
                    "name": "or",
                    "patterns": [
                        {
                            "pattern": "list",
                            "begin": [
                                {
                                    "if": {
                                        "cond": ["not", ["arrayp", "list"]],
                                        "then": ["error", { "q": "array required" }]
                                    }
                                },
                                {
                                    "if": {
                                        "cond": [">", ["list", { "q": "length" }], 0],
                                        "then": {
                                            "qq": {
                                                "if": {
                                                    "cond": { "uq": ["first", "list"] },
                                                    "then": { "uq": ["first", "list"] },
                                                    "else": { "or": { "uq": ["rest", "list"] } }
                                                }
                                            }
                                        },
                                        "else": false
                                    }
                                }
                            ]
                        }
                    ]
                }
            });
            execTop({
                "defmacro": {
                    "name": "and",
                    "patterns": [
                        {
                            "pattern": "list",
                            "begin": [
                                {
                                    "if": {
                                        "cond": ["not", ["arrayp", "list"]],
                                        "then": ["error", { "q": "array required" }]
                                    }
                                },
                                {
                                    "if": {
                                        "cond": [">", ["list", { "q": "length" }], 0],
                                        "then": {
                                            "if": {
                                                "cond": [">", ["list", { "q": "length" }], 1],
                                                "then": {
                                                    "qq": {
                                                        "if": {
                                                            "cond": { "uq": ["first", "list"] },
                                                            "then": { "and": { "uq": ["rest", "list"] } },
                                                            "else": false
                                                        }
                                                    }
                                                },
                                                "else": ["first", "list"],
                                            }
                                        },
                                        "else": true
                                    }
                                }
                            ]
                        }
                    ]
                }
            });
            execTop({
                "defmacro": {
                    "name": "message",
                    "patterns": [
                        {
                            "pattern": {
                                "extends": "_extend",
                                "messages": "obj"
                            },
                            "begin": [
                                {
                                    "if": {
                                        "cond": ["not", ["objectp", "obj"]],
                                        "then": ["error", { "q": "object required" }]
                                    }
                                },
                                {
                                    "qq": {
                                        "function": {
                                            "args": ["_message"],
                                            "begin": [
                                                {
                                                    "uq": {
                                                        "let": {
                                                            "name": "loop",
                                                            "vars": {
                                                                "lst": ["keys", "obj"]
                                                            },
                                                            "begin": [
                                                                {
                                                                    "if": {
                                                                        "cond": [">", ["lst", { "q": "length" }], 0],
                                                                        "then": {
                                                                            "qq": {
                                                                                "if": {
                                                                                    "cond": ["eqv", "_message", { "q": { "uq": ["lst", 0] }}],
                                                                                    "then": { "uq": ["obj", ["lst", 0]] },
                                                                                    "else": { "uq": ["loop", ["rest", "lst"]] }
                                                                                }
                                                                            }
                                                                        },
                                                                        "else": {
                                                                            "if": {
                                                                                "cond": "_extend",
                                                                                "then": ["list", "_extend", { "q": "_message" }],
                                                                                "else": { "q": ["error", { "q": "message not found" }]}
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            ]
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }
            });
        }
        if(!envs) {
            initMacro();
        }
        if(isArray(input)) {
            for(i = 0; i < input.length; i++) {
                res = execTop(input[i]);
            }
            return {
                result: resultToString(res),
                envs: {
                    funcs: funcs,
                    genv: genv,
                    macroEnv: macroEnv
                }
            };
        } else {
            return {
                result: resultToString(execTop(input)),
                envs: {
                    funcs: funcs,
                    genv: genv,
                    macroEnv: macroEnv
                }
            };
        }
    }

    function evalOnce(input) {
        return evalLang(input).result;
    }

    function createEvalEnv(builtIn) {
        var envs = null;
        return function(input) {
            var result = evalLang(input, envs, builtIn);
            envs = result.envs;
            return result.result;
        };
    }

    var LangModule = {
        eval: evalOnce,
        createEval: createEvalEnv
    };

    if(typeof module !== "undefined" && module.exports) {
        module.exports = LangModule;
    } else {
        root["Koume"] = LangModule;
    }
})(this);
