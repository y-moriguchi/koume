/**
 * Koume
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
/*
 * This test case describe by Jasmine.
 */
describe("Koume", function () {
	function equal(json, val) {
		expect(Koume.eval(json)).toEqual(val);
	}

	beforeEach(function () {
	});

	describe("unit", function () {
		it("literal", function () {
			equal([765], 765);
			equal([true], true);
			equal([false], false);
			equal([null], null);
		});
		it("apply builtin", function () {
			equal([["add", 765, 346]], 1111);
		});
		it("define constant", function () {
			equal([
				{
					"define": {
						"x": 765
					}
				},
				"x"
			], 765);
		});
		it("define and apply function", function () {
			equal([
				{
					"define": {
						"twice": {
							"function": {
								"args": ["x"],
								"begin": [
									["add", "x", "x"]
								]
							}
						}
					}
				},
				["twice", 2]
			], 4);
		});
		it("quote", function () {
			equal([{ "q": { "a": 765, "b": 346 }}], { "a": 765, "b": 346 });
		});
		it("ref", function () {
			equal([
				{
					"ref": {
						"a": {
							"q": { "a": 765, "b": 346 }
						}
					}
				}
			], 765);
		});
		it("cons", function () {
			equal([
				{
					"cons": {
						"a": ["add", 765, 346],
						"b": ["sub", 2, 1]
					}
				}
			], { "a": 1111, "b": 1 });
		});
		it("begin", function () {
			equal([
				{
					"begin": [
						961,
						["add", 765, 346]
					]
				}
			], 1111);
		});
		it("if", function () {
			equal([
				{
					"if": {
						"cond": 1,
						"then": 765,
						"else": 961
					}
				}
			], 765);
			equal([
				{
					"if": {
						"cond": 0,
						"then": 961,
						"else": 765
					}
				}
			], 765);
		});
		it("cond", function () {
			var cond = {
				"cond": [
					{
						"case": ["eqv", "x", 2],
						"then": 4
					},
					{
						"case": ["eqv", "x", 3],
						"then": 6
					},
					{
						"case": true,
						"then": 0
					}
				]
			};			
			equal([{ "define": { "x": 2 } }, cond], 4);
			equal([{ "define": { "x": 3 } }, cond], 6);
			equal([{ "define": { "x": 4 } }, cond], 0);
		});
		it("set", function () {
			equal([
				{ "define": { "x": 961 } },
				{ "set": { "x": 765 } },
				"x"
			], 765);
		});
		it("let", function () {
			equal([
				{
					"define": {
						"x": 765
					}
				},
				{
					"let": {
						"vars": {
							"x": 346,
							"y": ["add", "x", 346]
						},
						"begin": [
							["sub", "y", "x"]
						]
					}
				}
			], 765);
		});
		it("named let", function () {
			equal([
				{
					"let": {
						"name": "sum",
						"vars": {
							"x": 10,
							"y": 0
						},
						"begin": [
							{
								"if": {
									"cond": ["eqv", "x", 0],
									"then": "y",
									"else": ["sum", ["sub", "x", 1], ["add", "x", "y"]]
								}
							}
						]
					}
				}
			], 55);
		});
		it("letrec", function () {
			equal([
				{
					"letrec": {
						"vars": {
							"sum": {
								"function": {
									"args": ["x", "y"],
									"begin": [
										{
											"if": {
												"cond": ["eqv", "x", 0],
												"then": "y",
												"else": ["sum", ["sub", "x", 1], ["add", "x", "y"]]
											}
										}
									]
								}
							}
						},
						"begin": [
							["sum", 10, 0]
						]
					}
				}
			], 55);
		});
		it("quasiqoute", function () {
			equal([
				{
					"qq": {
						"a": ["aaaa", 1, true, false, null],
						"b": {
							"aaa": 1,
							"uq": 2
						},
						"c": {
							"uq": ["add", 1, 2]
						}
					}
				}
			], {
				"a": ["aaaa", 1, true, false, null],
				"b": {
					"aaa": 1,
					"uq": 2
				},
				"c": 3
			});
		});
	});

	describe("tail recursion", function () {
		it("single", function () {
			equal([
				{
					"letrec": {
						"vars": {
							"sum": {
								"function": {
									"args": ["x", "y"],
									"begin": [
										{
											"if": {
												"cond": ["eqv", "x", 0],
												"then": "y",
												"else": ["sum", ["sub", "x", 1], ["add", "x", "y"]]
											}
										}
									]
								}
							}
						},
						"begin": [
							["sum", 1000000, 0]
						]
					}
				}
			], 500000500000);
		});
		it("mutual", function () {
			equal([
				{
					"letrec": {
						"vars": {
							"sum1": {
								"function": {
									"args": ["x", "y"],
									"begin": [
										{
											"if": {
												"cond": ["eqv", "x", 0],
												"then": "y",
												"else": ["sum2", ["sub", "x", 1], ["add", "x", "y"]]
											}
										}
									]
								}
							},
							"sum2": {
								"function": {
									"args": ["x", "y"],
									"begin": [
										{
											"if": {
												"cond": ["eqv", "x", 0],
												"then": "y",
												"else": ["sum1", ["sub", "x", 1], ["add", "x", "y"]]
											}
										}
									]
								}
							}
						},
						"begin": [
							["sum1", 1000000, 0]
						]
					}
				}
			], 500000500000);
		});
	});

	describe("continuation", function () {
		it("backward", function () {
			equal([
				[
					"callcc",
					{
						"function": {
							"args": ["k"],
							"begin": [
								["k", 765],
								961
							]
						}
					}
				]
			], 765);
		});
		it("forward", function () {
			equal([
				{
					"define": {
						"s": null
					}
				},
				[
					"add",
					346,
					[
						"callcc",
						{
							"function": {
								"args": ["k"],
								"begin": [
									{
										"set": { "s": "k" }
									},
									961
								]
							}
						}
					]
				],
				["s", 765]
			], 1111);
		});
	});

	describe("closure", function () {
		it("closure", function () {
			equal([
				{ "define": { "x": 961 } },
				{
					"define": {
						"f": {
							"function": {
								"args": [],
								"begin": [
									{ "define": { "x": 0 } },
									{
										"function": {
											"args": [],
											"begin": [
												{ "set": { "x": ["add", "x", 1] } },
												"x"
											]
										}
									}
								]
							}
						}
					}
				},
				[["f"]]
			], 1);
		});
	});

	describe("library", function () {
		it("add", function () {
			equal([["add", 765, 346]], 1111);
			equal([["add", 1, 2, 3, 4, 5]], 15);
			equal([["add"]], 0);
		});
		it("sub", function () {
			equal([["sub", 2, 1]], 1);
			equal([["sub", 3, 2, 1]], 0);
			equal([["sub", 2]], -2);
			expect(function() { equal([["sub"]]) }).toThrow();
		});
		it("mul", function () {
			equal([["mul", 2, 3]], 6);
			equal([["mul", 2, 3, 4, 5]], 120);
			equal([["mul"]], 1);
		});
		it("div", function () {
			equal([["div", 4, 2]], 2);
			equal([["div", 6, 3, 2]], 1);
			equal([["div", 2]], 0.5);
			expect(function() { equal([["div"]]) }).toThrow();
		});
	});
});
