#!/usr/bin/env node
/*
 * Koume
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
var fs = require("fs"),
	Koume = require("./koume.js");

function usage() {
	console.error("Koume Ver. 0.1.0");
	console.error("usage: koume [-n] filename");
}

function parseOption() {
	var argCount = 2,
		result = {};
	while(argCount < process.argv.length) {
		if(process.argv[argCount] === "-n") {
			result.notOutputResult = true;
			argCount++;
		} else if(process.argv[argCount] === "--exception") {
			result.throwException = true;
			argCount++;
		} else if(process.argv[argCount].substring(0, 1) === "-") {
			console.error("Unrecognized option: " + process.argv[argCount]);
			process.exit(2);
		} else {
			result.input = process.argv[argCount];
			argCount++;
		}
	}
	if(!result.input) {
		usage();
		process.exit(2);
	}
	return result;
}

function main() {
	var text,
		result,
		option = parseOption();
	try {
		text = fs.readFileSync(option.input, 'utf8');
	} catch(e) {
		console.log("file cannot read");
		process.exit(2);
	}

	try {
		result = Koume.eval(JSON.parse(text));
		if(!option.notOutputResult) {
			console.log(JSON.stringify(result));
		}
	} catch(e) {
		if(option.throwException) {
			throw e;
		} else {
			console.error("Error occurred: " + e.message);
			process.exit(4);
		}
	}
}

main();
