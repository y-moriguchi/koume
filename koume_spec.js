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

            expect(function() { equal([
                {
                    "function": null
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "function": {
                        "args": ["x"]
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "function": {
                        "args": ["x"],
                        "begin": 961
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "function": {
                        "args": ["x"],
                        "begin": []
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "function": {
                        "begin": [
                            ["add", 1, 2]
                        ]
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "function": {
                        "begin": [
                            ["add", 1, 2]
                        ]
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "function": {
                        "args": 1,
                        "begin": [
                            ["add", 1, 2]
                        ]
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "function": {
                        "args": [1],
                        "begin": [
                            ["add", 1, 2]
                        ]
                    }
                }
            ]) }).toThrow();
        });

        it("quote", function () {
            equal([{ "q": { "a": 765, "b": 346 }}], { "a": 765, "b": 346 });
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
            expect(function() { equal([{ "cons": null }]) }).toThrow();
            expect(function() { equal([{ "cons": 961 }]) }).toThrow();
        });

        it("tuple", function () {
            equal([
                [{
                    "tuple": {
                        "a": ["add", 765, 346],
                        "b": ["sub", 2, 1]
                    }
                }, { "q": "a" }]
            ], 1111);
            expect(function() { equal([{ "tuple": null }]) }).toThrow();
            expect(function() { equal([{ "tuple": 961 }]) }).toThrow();
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
            expect(function() { equal([{ "begin": null }]) }).toThrow();
            expect(function() { equal([{ "begin": 961 }]) }).toThrow();
            expect(function() { equal([{ "begin": { "a": 961 } }]) }).toThrow();
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
                        "cond": false,
                        "then": 961,
                        "else": 765
                    }
                }
            ], 765);

            equal([
                {
                    "if": {
                        "cond": 1,
                        "then": 765
                    }
                }
            ], 765);

            equal([
                {
                    "if": {
                        "cond": false,
                        "then": 961
                    }
                }
            ], null);
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
            expect(function() { equal([{ "cond": null }]) }).toThrow();
            expect(function() { equal([{ "cond": 961 }]) }).toThrow();
            expect(function() { equal([{ "cond": { "a": 961 } }]) }).toThrow();
            expect(function() { equal([{ "cond": [] }]) }).toThrow();
        });

        it("set", function () {
            equal([
                { "define": { "x": 961 } },
                { "set": { "x": 765 } },
                "x"
            ], 765);
            expect(function() { equal([{ "set": null }]) }).toThrow();
            expect(function() { equal([{ "set": 961 }]) }).toThrow();
            expect(function() { equal([{ "set": { "z": 961 } }]) }).toThrow();
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

            expect(function() { equal([{
                "let": {
                    "vars": {
                        "x": 346
                    }
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "let": {
                    "vars": {
                        "x": 346
                    },
                    "begin": 1
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "let": {
                    "vars": {
                        "x": 346
                    },
                    "begin": { "a": 1 }
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "let": {
                    "vars": {
                        "x": 346
                    },
                    "begin": []
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "let": {
                    "begin": [
                        ["sub", "y", "x"]
                    ]
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "let": {
                    "vars": 1,
                    "begin": [
                        ["sub", "y", "x"]
                    ]
                }
            }]) }).toThrow();
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

            expect(function() { equal([{
                "letrec": {
                    "vars": {
                        "x": 346
                    }
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "letrec": {
                    "vars": {
                        "x": 346
                    },
                    "begin": 1
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "letrec": {
                    "vars": {
                        "x": 346
                    },
                    "begin": { "a": 1 }
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "letrec": {
                    "vars": {
                        "x": 346
                    },
                    "begin": []
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "letrec": {
                    "begin": [
                        ["sub", "y", "x"]
                    ]
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "letrec": {
                    "vars": 1,
                    "begin": [
                        ["sub", "y", "x"]
                    ]
                }
            }]) }).toThrow();
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

        it("tq", function () {
            equal([[
                {
                    "tq": {
                        "a": 1,
                        "b": {
                            "aaa": 1,
                            "uq": 2
                        },
                        "c": {
                            "uq": ["add", 1, 2]
                        }
                    }
                }
            , { "q": "c" }]], 3);
        });

        it("sq", function () {
            equal([
                { "define": { "x": 765 } },
                { "sq": "$x production" }
            ], "765 production");
            equal([
                { "define": { "x": 765 } },
                { "sq": "${x}pro" }
            ], "765pro");
            equal([
                { "define": { "x": 765 } },
                { "sq": "Welcome to $x production" }
            ], "Welcome to 765 production");
            equal([
                {
                    "define": {
                        "x": {
                            "q": {
                                "aaaa": {
                                    "bbbb": 765,
                                    "cccc": 346
                                },
                                "dddd": 283
                            }
                        }
                    }
                },
                { "sq": "Welcome to ${x.aaaa.bbbb}, $x.aaaa.cccc and $x.dddd production" }
            ], "Welcome to 765, 346 and 283 production");
            expect(function() { equal([{ "set": null }]) }).toThrow();
            expect(function() { equal([{ "set": 961 }]) }).toThrow();
        });

        it("and", function () {
            equal([{ "and": [1, 2, 3] }], 3);
            equal([{ "and": [false, 2, 3] }], false);
            equal([{ "and": [1] }], 1);
            equal([{ "and": [] }], true);
            expect(function() { equal([{ "and": null }]) }).toThrow();
            expect(function() { equal([{ "and": 961 }]) }).toThrow();
            expect(function() { equal([{ "and": { "z": 961 } }]) }).toThrow();
        });

        it("or", function () {
            equal([{ "or": [1, 2, 3] }], 1);
            equal([{ "or": [false, 2, 3] }], 2);
            equal([{ "or": [false, false, false] }], false);
            equal([{ "or": [1] }], 1);
            equal([{ "or": [] }], false);
            expect(function() { equal([{ "or": null }]) }).toThrow();
            expect(function() { equal([{ "or": 961 }]) }).toThrow();
            expect(function() { equal([{ "or": { "z": 961 } }]) }).toThrow();
        });

        it("match", function () {
            function createTarget1(target) {
                return [{
                    "match": {
                        "target": { "q": target },
                        "patterns": [
                            {
                                "pattern": {
                                    "aaaa": "a",
                                    "bbbb": {
                                        "cccc": "c",
                                    },
                                    "iiii": ["d", "e"]
                                },
                                "begin": [["list", "a", "c", "d", "e"]]
                            },
                            {
                                "pattern": {
                                    "jjjj": "a"
                                },
                                "begin": ["a"]
                            }
                        ]
                    }
                }];
            }

            equal(createTarget1({
                "aaaa": { "a": 1 },
                "bbbb": {
                    "cccc": [346]
                },
                "iiii": [765, [283]]
            }), [{ "a": 1 }, [346], 765, [283]]); 

            equal(createTarget1({
                "aaaa": { "a": 1 },
                "bbbb": {
                    "cccc": [346]
                },
                "iiii": [765, [283]],
                "jjjj": 1
            }), [{ "a": 1 }, [346], 765, [283]]); 

            equal(createTarget1({
                "aaaa": { "a": 1 },
                "bbbb": {
                    "cccc": [346],
                    "dddd": 315
                },
                "iiii": [765, [283]]
            }), [{ "a": 1 }, [346], 765, [283]]); 

            equal(createTarget1({
                "bbbb": {
                    "cccc": [346]
                },
                "iiii": [765, [283]]
            }), null); 

            equal(createTarget1({
                "aaaa": { "a": 1 },
                "bbbb": {
                },
                "iiii": [765, [283]]
            }), null); 

            equal(createTarget1({
                "aaaa": { "a": 1 },
                "bbbb": {
                    "cccc": [346]
                }
            }), null); 

            equal(createTarget1({
                "aaaa": { "a": 1 },
                "bbbb": {
                    "cccc": [346]
                },
                "iiii": [765]
            }), null); 

            equal(createTarget1({
                "jjjj": { "a": 1 }
            }), { "a": 1 }); 

            expect(function() { equal([{
                "match": {
                    "patterns": [
                        {
                            "pattern": "a",
                            "match": ["a"]
                        }
                    ]
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "match": {
                    "target": 1
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "match": {
                    "target": 1,
                    "patterns": 961
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "match": {
                    "target": 1,
                    "patterns": []
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "match": {
                    "target": 1,
                    "patterns": [961]
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "match": {
                    "target": 1,
                    "patterns": [
                        {
                            "match": ["a"]
                        }
                    ]
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "match": {
                    "target": 1,
                    "patterns": [
                        {
                            "pattern": "a"
                        }
                    ]
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "match": {
                    "target": 1,
                    "patterns": [
                        {
                            "pattern": "a",
                            "match": "a"
                        }
                    ]
                }
            }]) }).toThrow();

            expect(function() { equal([{
                "match": {
                    "target": 1,
                    "patterns": [
                        {
                            "pattern": "a",
                            "match": []
                        }
                    ]
                }
            }]) }).toThrow();
        });

        it("defmacro", function () {
            equal([
                {
                    "defmacro": {
                        "name": "aaaa",
                        "patterns": [
                            {
                                "pattern": {
                                    "bbbb": "a"
                                },
                                "begin": [
                                    {
                                        "qq": ["list", { "uq": "a" }]
                                    }
                                ]
                            },
                            {
                                "pattern": {
                                    "cccc": "a"
                                },
                                "begin": [
                                    "a"
                                ]
                            }
                        ]
                    }
                },
                {
                    "aaaa": {
                        "bbbb": 1
                    }
                }
            ], [1]);

            equal([
                {
                    "defmacro": {
                        "name": "aaaa",
                        "patterns": [
                            {
                                "pattern": {
                                    "bbbb": "a"
                                },
                                "begin": [
                                    {
                                        "qq": ["list", { "uq": "a" }]
                                    }
                                ]
                            },
                            {
                                "pattern": {
                                    "cccc": "a"
                                },
                                "begin": [
                                    "a"
                                ]
                            }
                        ]
                    }
                },
                {
                    "aaaa": {
                        "cccc": 1
                    }
                }
            ], 1);

            expect(function() { equal([
                {
                    "defmacro": {
                        "patterns": [
                            {
                                "pattern": {
                                    "bbbb": "a"
                                },
                                "begin": [
                                    {
                                        "qq": ["list", { "uq": "a" }]
                                    }
                                ]
                            },
                            {
                                "pattern": {
                                    "cccc": "a"
                                },
                                "begin": [
                                    "a"
                                ]
                            }
                        ]
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "defmacro": {
                        "name": "aaaa"
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "defmacro": {
                        "name": "aaaa",
                        "patterns": 961
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "defmacro": {
                        "name": "aaaa",
                        "patterns": []
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "defmacro": {
                        "name": "aaaa",
                        "patterns": [
                            {
                                "pattern": {
                                    "bbbb": "a"
                                },
                                "begin": [
                                    {
                                        "qq": ["list", { "uq": "a" }]
                                    }
                                ]
                            },
                            {
                                "pattern": {
                                    "cccc": "a"
                                },
                                "begin": [
                                    "a"
                                ]
                            }
                        ]
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "defmacro": {
                        "name": "aaaa",
                        "patterns": [961]
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "defmacro": {
                        "name": "aaaa",
                        "patterns": [
                            {
                                "begin": [
                                    {
                                        "qq": ["list", { "uq": "a" }]
                                    }
                                ]
                            }
                        ]
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "defmacro": {
                        "name": "aaaa",
                        "patterns": [
                            {
                                "pattern": {
                                    "bbbb": "a"
                                }
                            }
                        ]
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "defmacro": {
                        "name": "aaaa",
                        "patterns": [
                            {
                                "pattern": {
                                    "bbbb": "a"
                                },
                                "begin": 961
                            }
                        ]
                    }
                }
            ]) }).toThrow();

            expect(function() { equal([
                {
                    "defmacro": {
                        "name": "aaaa",
                        "patterns": [
                            {
                                "pattern": {
                                    "bbbb": "a"
                                },
                                "begin": []
                            }
                        ]
                    }
                }
            ]) }).toThrow();
        });

        it("message", function () {
            equal([
                [
                    {
                        "message": {
                            "extends": false,
                            "messages": {
                                "aaaa": 765,
                                "bbbb": 346
                            }
                        }
                    },
                    { "q": "aaaa" }
                ]
            ], 765);

            equal([
                [
                    {
                        "message": {
                            "extends": false,
                            "messages": {
                                "aaaa": 765,
                                "bbbb": 346
                            }
                        }
                    },
                    { "q": "bbbb" }
                ]
            ], 346);

            equal([
                [
                    {
                        "message": {
                            "extends": {
                                "message": {
                                    "extends": false,
                                    "messages": {
                                        "cccc": 283
                                    }
                                }
                            },
                            "messages": {
                                "aaaa": 765,
                                "bbbb": 346
                            }
                        }
                    },
                    { "q": "cccc" }
                ]
            ], 283);

            expect(function() { equal([
                [
                    {
                        "message": {
                            "extends": false,
                            "messages": {
                                "aaaa": 765,
                                "bbbb": 346
                            }
                        }
                    },
                    { "q": "cccc" }
                ]
            ]) }).toThrow();

            expect(function() { equal([
                [
                    {
                        "message": {
                            "extends": {
                                "message": {
                                    "extends": false,
                                    "messages": {
                                        "cccc": 283
                                    }
                                }
                            },
                            "messages": {
                                "aaaa": 765,
                                "bbbb": 346
                            }
                        }
                    },
                    { "q": "dddd" }
                ]
            ]) }).toThrow();

            expect(function() { equal([
                [
                    {
                        "message": {
                            "extends": false
                        }
                    },
                    { "q": "cccc" }
                ]
            ]) }).toThrow();

            expect(function() { equal([
                [
                    {
                        "message": {
                            "messages": {
                                "aaaa": 765,
                                "bbbb": 346
                            }
                        }
                    },
                    { "q": "cccc" }
                ]
            ]) }).toThrow();

            expect(function() { equal([
                [
                    {
                        "message": {
                            "extends": false,
                            "messages": 961
                        }
                    },
                    { "q": "cccc" }
                ]
            ]) }).toThrow();
        });

        it("delay/force", function () {
            equal([
                {
                    "define": {
                        "x": 765,
                        "promise": {
                            "delay": "x"
                        }
                    }
                },
                {
                    "define": {
                        "y": ["force", "promise"]
                    }
                },
                {
                    "set": {
                        "x": 961
                    }
                },
                ["force", "promise"]
            ], 765);
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

        it("error", function () {
            expect(function() { equal([
                [
                    "callcc",
                    961
                ]
            ]) }).toThrow();
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
            equal([["+", 765, 346]], 1111);
            equal([["add", 1, 2, 3, 4, 5]], 15);
            equal([["add"]], 0);
            expect(function() { equal([["add", { "q": "2" }]]) }).toThrow();
        });

        it("sub", function () {
            equal([["sub", 2, 1]], 1);
            equal([["-", 2, 1]], 1);
            equal([["sub", 3, 2, 1]], 0);
            equal([["sub", 2]], -2);
            expect(function() { equal([["sub"]]) }).toThrow();
            expect(function() { equal([["sub", { "q": "2" }]]) }).toThrow();
            expect(function() { equal([["sub", { "q": "2" }, { "q": "2" }]]) }).toThrow();
        });

        it("mul", function () {
            equal([["mul", 2, 3]], 6);
            equal([["*", 2, 3]], 6);
            equal([["mul", 2, 3, 4, 5]], 120);
            equal([["mul"]], 1);
            expect(function() { equal([["mul", { "q": "2" }]]) }).toThrow();
        });

        it("div", function () {
            equal([["div", 4, 2]], 2);
            equal([["/", 4, 2]], 2);
            equal([["div", 6, 3, 2]], 1);
            equal([["div", 2]], 0.5);
            expect(function() { equal([["div"]]) }).toThrow();
            expect(function() { equal([["div", { "q": "2" }]]) }).toThrow();
            expect(function() { equal([["div", { "q": "2" }, { "q": "2" }]]) }).toThrow();
        });

        it("quotient", function () {
            equal([["quotient", 4, 2]], 2);
            equal([["quotient", 7, 3]], 2);
            equal([["quotient", -7, 3]], -2);
            expect(function() { equal([["quotient", 2]]) }).toThrow();
            expect(function() { equal([["quotient", { "q": "2" }, { "q": "2" }]]) }).toThrow();
            expect(function() { equal([["quotient", 2.1, 2]]) }).toThrow();
        });

        it("remainder", function () {
            equal([["remainder", 4, 2]], 0);
            equal([["remainder", 7, 3]], 1);
            equal([["remainder", -7, 3]], -1);
            equal([["remainder", 7, -3]], 1);
            equal([["remainder", -7, -3]], -1);
            expect(function() { equal([["remainder", 2]]) }).toThrow();
            expect(function() { equal([["remainder", { "q": "2" }, { "q": "2" }]]) }).toThrow();
            expect(function() { equal([["remainder", 2.1, 2]]) }).toThrow();
        });

        it("modulo", function () {
            equal([["modulo", 4, 2]], 0);
            equal([["modulo", 7, 3]], 1);
            equal([["modulo", -7, 3]], 2);
            equal([["modulo", 7, -3]], -2);
            equal([["modulo", -7, -3]], -1);
            expect(function() { equal([["modulo", 2]]) }).toThrow();
            expect(function() { equal([["modulo", { "q": "2" }, { "q": "2" }]]) }).toThrow();
            expect(function() { equal([["modulo", 2.1, 2]]) }).toThrow();
        });

        it("eqv", function () {
            equal([["eqv", 2, 2]], true);
            equal([["eqv", 4, 2]], false);
            equal([["eqv", { "q": "2" }, 2]], false);
            equal([["eqv", { "q": "2" }, { "q": "2" }]], true);
        });

        it("=", function () {
            equal([["=", 2, 2]], true);
            equal([["=", 2, 2, 2, 2, 2]], true);
            equal([["=", 2]], true);
            equal([["="]], true);
            equal([["=", 4, 2]], false);
            equal([["=", 2, 2, 2, 2, 4]], false);
            expect(function() { equal([["=", 2, { "q": "2" }]]) }).toThrow();
        });

        it("!=", function () {
            equal([["!=", 2, 4]], true);
            equal([["!=", 2, 3, 4, 5, 1]], true);
            equal([["!=", 2]], true);
            equal([["!="]], true);
            equal([["!=", 2, 2]], false);
            equal([["!=", 2, 2, 2, 2, 4]], false);
            expect(function() { equal([["!=", 2, { "q": "2" }]]) }).toThrow();
        });

        it("<", function () {
            equal([["<", 2, 4]], true);
            equal([["<", 2, 3, 4, 5, 6]], true);
            equal([["<", 2]], true);
            equal([["<"]], true);
            equal([["<", 4, 2]], false);
            equal([["<", 2, 3, 4, 5, 1]], false);
            equal([["<", 2, 3, 4, 5, 5]], false);
            expect(function() { equal([["<", 2, { "q": "2" }]]) }).toThrow();
        });

        it("<=", function () {
            equal([["<=", 2, 4]], true);
            equal([["<=", 2, 3, 4, 5, 6]], true);
            equal([["<=", 2, 3, 4, 5, 5]], true);
            equal([["<=", 2]], true);
            equal([["<="]], true);
            equal([["<=", 4, 2]], false);
            equal([["<=", 2, 3, 4, 5, 1]], false);
            expect(function() { equal([["<", 2, { "q": "2" }]]) }).toThrow();
        });

        it(">", function () {
            equal([[">", 4, 2]], true);
            equal([[">", 6, 5, 4, 3, 2]], true);
            equal([[">", 2]], true);
            equal([[">"]], true);
            equal([[">", 2, 4]], false);
            equal([[">", 6, 5, 4, 3, 7]], false);
            equal([[">", 6, 5, 4, 3, 3]], false);
            expect(function() { equal([[">", 2, { "q": "2" }]]) }).toThrow();
        });

        it(">=", function () {
            equal([[">=", 4, 2]], true);
            equal([[">=", 6, 5, 4, 3, 2]], true);
            equal([[">=", 6, 5, 4, 3, 3]], true);
            equal([[">=", 2]], true);
            equal([[">="]], true);
            equal([[">=", 2, 4]], false);
            equal([[">=", 6, 5, 4, 3, 7]], false);
            expect(function() { equal([[">=", 2, { "q": "2" }]]) }).toThrow();
        });

        it("not", function () {
            equal([["not", 1]], false);
            equal([["not", 0]], false);
            equal([["not", { "q": "2" }]], false);
            equal([["not", { "q": "" }]], false);
            equal([["not", null]], false);
            equal([["not", false]], true);
        });

        it("sin", function () {
            equal([["sin", 0]], 0);
            expect(function() { equal([["sin"]]) }).toThrow();
            expect(function() { equal([["sin", 0, 1]]) }).toThrow();
            expect(function() { equal([["sin", { "q": "2" }]]) }).toThrow();
        });

        it("cos", function () {
            equal([["cos", 0]], 1);
            expect(function() { equal([["cos"]]) }).toThrow();
            expect(function() { equal([["cos", 0, 1]]) }).toThrow();
            expect(function() { equal([["cos", { "q": "2" }]]) }).toThrow();
        });

        it("tan", function () {
            equal([["tan", 0]], 0);
            expect(function() { equal([["tan"]]) }).toThrow();
            expect(function() { equal([["tan", 0, 1]]) }).toThrow();
            expect(function() { equal([["tan", { "q": "2" }]]) }).toThrow();
        });

        it("asin", function () {
            equal([["asin", 0]], 0);
            expect(function() { equal([["asin"]]) }).toThrow();
            expect(function() { equal([["asin", 0, 1]]) }).toThrow();
            expect(function() { equal([["asin", { "q": "2" }]]) }).toThrow();
        });

        it("acos", function () {
            equal([["acos", 1]], 0);
            expect(function() { equal([["acos"]]) }).toThrow();
            expect(function() { equal([["acos", 0, 1]]) }).toThrow();
            expect(function() { equal([["acos", { "q": "2" }]]) }).toThrow();
        });

        it("atan", function () {
            equal([["atan", 0]], 0);
            expect(function() { equal([["atan"]]) }).toThrow();
            expect(function() { equal([["atan", 0, 1]]) }).toThrow();
            expect(function() { equal([["atan", { "q": "2" }]]) }).toThrow();
        });

        it("exp", function () {
            equal([["exp", 0]], 1);
            expect(function() { equal([["exp"]]) }).toThrow();
            expect(function() { equal([["exp", 0, 1]]) }).toThrow();
            expect(function() { equal([["exp", { "q": "2" }]]) }).toThrow();
        });

        it("expt", function () {
            equal([["expt", 2, 2]], 4);
            expect(function() { equal([["expt", 1]]) }).toThrow();
            expect(function() { equal([["expt", 2, 2, 2]]) }).toThrow();
            expect(function() { equal([["expt", { "q": "2" }, { "q": "2" }]]) }).toThrow();
        });

        it("log", function () {
            equal([["log", 1]], 0);
            expect(function() { equal([["log"]]) }).toThrow();
            expect(function() { equal([["log", 0, 1]]) }).toThrow();
            expect(function() { equal([["log", { "q": "2" }]]) }).toThrow();
        });

        it("list", function () {
            equal([["list", 1]], [1]);
            equal([["list", 1, { "q": "2" }]], [1, "2"]);
            equal([["list"]], []);
        });

        it("first", function () {
            equal([["first", { "q": [1, "2", 3] }]], 1);
            equal([["first", { "q": [1] }]], 1);
            expect(function() { equal([["first", { "q": [] }]]) }).toThrow();
            expect(function() { equal([["first", 1]]) }).toThrow();
        });

        it("rest", function () {
            equal([["rest", { "q": [1, "2", 3] }]], ["2", 3]);
            equal([["rest", { "q": [1] }]], []);
            expect(function() { equal([["rest", { "q": [] }]]) }).toThrow();
            expect(function() { equal([["rest", 1]]) }).toThrow();
        });

        it("setprop", function () {
            equal([
                {
                    "define": {
                        "a": {
                            "cons": {}
                        }
                    }
                },
                ["setprop", { "q": "aaaa" }, "a", 1],
                ["a", { "q": "aaaa" }]
            ], 1);

            equal([
                {
                    "define": {
                        "a": {
                            "cons": {
                                "aaaa": 961
                            }
                        }
                    }
                },
                ["setprop", { "q": "aaaa" }, "a", 1],
                ["a", { "q": "aaaa" }]
            ], 1);

            expect(function() { equal([
                {
                    "define": {
                        "a": {
                            "cons": {}
                        }
                    }
                },
                ["setprop", 1, "a", 1]
            ]) }).toThrow();
            expect(function() { equal([["setprop", { "q": "aaaa" }, 1, 1]]) }).toThrow();
        });

        it("numberp", function () {
            equal([["numberp", 1]], true);
            equal([["numberp", 1.2]], true);
            equal([["numberp", { "q": "2" }]], false);
            equal([["numberp", { "q": [1] }]], false);
            equal([["numberp", { "q": { "aaaa": 1 } }]], false);
            equal([["numberp", null]], false);
            equal([["numberp", true]], false);
            equal([["numberp", false]], false);
            equal([["numberp", "add"]], false);
        });

        it("integerp", function () {
            equal([["integerp", 1]], true);
            equal([["integerp", 1.2]], false);
            equal([["integerp", { "q": "2" }]], false);
            equal([["integerp", { "q": [1] }]], false);
            equal([["integerp", { "q": { "aaaa": 1 } }]], false);
            equal([["integerp", null]], false);
            equal([["integerp", true]], false);
            equal([["integerp", false]], false);
            equal([["integerp", "add"]], false);
        });

        it("floor", function () {
            equal([["floor", 1]], 1);
            equal([["floor", 1.2]], 1);
            equal([["floor", -1.2]], -2);
            expect(function() { equal([["floor"]]) }).toThrow();
            expect(function() { equal([["floor", 0, 1]]) }).toThrow();
            expect(function() { equal([["floor", { "q": "2" }]]) }).toThrow();
        });

        it("ceiling", function () {
            equal([["ceiling", 1]], 1);
            equal([["ceiling", 1.2]], 2);
            equal([["ceiling", -1.2]], -1);
            expect(function() { equal([["ceiling"]]) }).toThrow();
            expect(function() { equal([["ceiling", 0, 1]]) }).toThrow();
            expect(function() { equal([["ceiling", { "q": "2" }]]) }).toThrow();
        });

        it("trancate", function () {
            equal([["trancate", 1]], 1);
            equal([["trancate", 1.2]], 1);
            equal([["trancate", -1.2]], -1);
            expect(function() { equal([["trancate"]]) }).toThrow();
            expect(function() { equal([["trancate", 0, 1]]) }).toThrow();
            expect(function() { equal([["trancate", { "q": "2" }]]) }).toThrow();
        });

        it("round", function () {
            equal([["round", 1]], 1);
            equal([["round", 1.2]], 1);
            equal([["round", -1.2]], -1);
            equal([["round", 1.5]], 2);
            equal([["round", -1.5]], -1);
            expect(function() { equal([["round"]]) }).toThrow();
            expect(function() { equal([["round", 0, 1]]) }).toThrow();
            expect(function() { equal([["round", { "q": "2" }]]) }).toThrow();
        });

        it("sqrt", function () {
            equal([["sqrt", 841]], 29);
            expect(function() { equal([["sqrt"]]) }).toThrow();
            expect(function() { equal([["sqrt", 0, 1]]) }).toThrow();
            expect(function() { equal([["sqrt", { "q": "2" }]]) }).toThrow();
        });

        it("numberToString", function () {
            equal([["numberToString", 765]], "765");
            equal([["numberToString", 765, 16]], "2fd");
            equal([["numberToString", 765, 2]], "1011111101");
            equal([["numberToString", 765, 36]], "l9");
            expect(function() { equal([["numberToString", { "q": "2" }]]) }).toThrow();
            expect(function() { equal([["numberToString", 961, 1]]) }).toThrow();
            expect(function() { equal([["numberToString", 961, 37]]) }).toThrow();
        });

        it("stringToNumber", function () {
            equal([["stringToNumber", { "q": "765" }]], 765);
            equal([["stringToNumber", { "q": "765.346" }]], 765.346);
            equal([["stringToNumber", { "q": "aaaa" }]], NaN);
            expect(function() { equal([["stringToNumber", 961]]) }).toThrow();
        });

        it("stringToInteger", function () {
            equal([["stringToInteger", { "q": "765" }]], 765);
            equal([["stringToInteger", { "q": "2fd" }, 16]], 765);
            equal([["stringToInteger", { "q": "1011111101" }, 2]], 765);
            equal([["stringToInteger", { "q": "l9" }, 36]], 765);
            expect(function() { equal([["stringToInteger", 961]]) }).toThrow();
            expect(function() { equal([["stringToInteger", { "q": "765" }, 1]]) }).toThrow();
            expect(function() { equal([["stringToInteger", { "q": "765" }, 37]]) }).toThrow();
        });

        it("booleanp", function () {
            equal([["booleanp", 1]], false);
            equal([["booleanp", 1.2]], false);
            equal([["booleanp", { "q": "2" }]], false);
            equal([["booleanp", { "q": [1] }]], false);
            equal([["booleanp", { "q": { "aaaa": 1 } }]], false);
            equal([["booleanp", null]], false);
            equal([["booleanp", true]], true);
            equal([["booleanp", false]], true);
            equal([["booleanp", "add"]], false);
        });

        it("nullp", function () {
            equal([["nullp", 1]], false);
            equal([["nullp", 1.2]], false);
            equal([["nullp", { "q": "2" }]], false);
            equal([["nullp", { "q": [1] }]], false);
            equal([["nullp", { "q": { "aaaa": 1 } }]], false);
            equal([["nullp", null]], true);
            equal([["nullp", true]], false);
            equal([["nullp", false]], false);
            equal([["nullp", "add"]], false);
        });

        it("arrayp", function () {
            equal([["arrayp", 1]], false);
            equal([["arrayp", 1.2]], false);
            equal([["arrayp", { "q": "2" }]], false);
            equal([["arrayp", { "q": [1] }]], true);
            equal([["arrayp", { "q": { "aaaa": 1 } }]], false);
            equal([["arrayp", null]], false);
            equal([["arrayp", true]], false);
            equal([["arrayp", false]], false);
            equal([["arrayp", "add"]], false);
        });

        it("objectp", function () {
            equal([["objectp", 1]], false);
            equal([["objectp", 1.2]], false);
            equal([["objectp", { "q": "2" }]], false);
            equal([["objectp", { "q": [1] }]], true);
            equal([["objectp", { "q": { "aaaa": 1 } }]], true);
            equal([["objectp", null]], false);
            equal([["objectp", true]], false);
            equal([["objectp", false]], false);
            equal([["objectp", "add"]], false);
        });

        it("keys", function () {
            equal([["keys", { "q": { "aaaa": 1, "bbbb": 2 } }]], ["aaaa", "bbbb"]);
            equal([["keys", { "q": [765, 346] }]], ["0", "1"]);
            expect(function() { equal([["keys", { "q": "2" }]]) }).toThrow();
        });

        it("equal", function () {
            equal([["equal", { "q": { "a": 1, "b": 2 } }, { "q": { "a": 1, "b": 2 } }]], true);
            equal([["equal", { "q": { "a": 1, "b": 2 } }, { "q": { "a": 1, "b": 3 } }]], false);
            equal([["equal", { "q": { "a": 1, "b": 2 } }, { "q": { "a": 1, "c": 2 } }]], false);
            equal([["equal", { "q": { "a": 1, "b": 2 } }, { "q": { "a": 1, "b": 2, "c": 2 } }]], false);
            equal([["equal", { "q": [1, 2] }, { "q": [1, 2] }]], true);
            equal([["equal", { "q": [1, 2] }, { "q": [1, 3] }]], false);
            equal([["equal", { "q": [1, 2] }, { "q": [1, 2, 3] }]], false);
            equal([["equal", { "q": [1, 2] }, { "q": { "0": 1, "1": 2 } }]], true);
            equal([["equal", { "q": { "a": 1, "b": { "a": 1, "b": 2 } } }, { "q": { "a": 1, "b": { "a": 1, "b": 2 } } }]], true);
            equal([["equal", { "q": { "a": 1, "b": [1, 2] } }, { "q": { "a": 1, "b": [1, 2] } }]], true);
            equal([["equal", { "q": "a" }, { "q": "a" }]], true);
            equal([["equal", 1, 1]], true);
            equal([["equal", true, true]], true);
            equal([["equal", false, false]], true);
            equal([["equal", null, null]], true);
        });

        it("length", function () {
            equal([["length", { "q": [765, 346] }]], 2);
            equal([["length", { "q": "aaaa" }]], 4);
            expect(function() { equal([["length", { "0": 1, "1": 2 }]]) }).toThrow();
            expect(function() { equal([["length", 1]]) }).toThrow();
        });

        it("max", function () {
            equal([["max", 1, 6, 5, 4, 3, 2]], 6);
            equal([["max", 2]], 2);
            equal([["max"]], -Infinity);
            expect(function() { equal([["max", 2, { "q": "2" }]]) }).toThrow();
        });

        it("min", function () {
            equal([["min", 1, 6, 5, 4, 3, 2]], 1);
            equal([["min", 2]], 2);
            equal([["min"]], Infinity);
            expect(function() { equal([["min", 2, { "q": "2" }]]) }).toThrow();
        });

        it("stringAppend", function () {
            equal([["stringAppend", { "q": "765" }, { "q": "346" }, { "q": "283" }]], "765346283");
            equal([["stringAppend", { "q": "765" }]], "765");
            equal([["stringAppend"]], "");
            expect(function() { equal([["stringAppend", 2, { "q": "2" }]]) }).toThrow();
        });

        it("string=", function () {
            equal([["string=", { "q": "a" }, { "q": "a" }]], true);
            equal([["string=", { "q": "a" }, { "q": "a" }, { "q": "a" }]], true);
            equal([["string=", { "q": "a" }]], true);
            equal([["string="]], true);
            equal([["string=", { "q": "a" }, { "q": "b" }]], false);
            equal([["string=", { "q": "a" }, { "q": "A" }]], false);
            equal([["string=", { "q": "a" }, { "q": "a" }, { "q": "b" }]], false);
            expect(function() { equal([["string=", 2, { "q": "2" }]]) }).toThrow();
        });

        it("stringci=", function () {
            equal([["stringci=", { "q": "a" }, { "q": "a" }]], true);
            equal([["stringci=", { "q": "a" }, { "q": "a" }, { "q": "a" }]], true);
            equal([["stringci=", { "q": "a" }]], true);
            equal([["stringci="]], true);
            equal([["stringci=", { "q": "a" }, { "q": "b" }]], false);
            equal([["stringci=", { "q": "a" }, { "q": "A" }]], true);
            equal([["stringci=", { "q": "a" }, { "q": "a" }, { "q": "b" }]], false);
            expect(function() { equal([["stringci=", 2, { "q": "2" }]]) }).toThrow();
        });

        it("string!=", function () {
            equal([["string!=", { "q": "a" }, { "q": "b" }]], true);
            equal([["string!=", { "q": "a" }, { "q": "A" }]], true);
            equal([["string!=", { "q": "a" }, { "q": "b" }, { "q": "c" }]], true);
            equal([["string!=", { "q": "a" }]], true);
            equal([["string!="]], true);
            equal([["string!=", { "q": "a" }, { "q": "a" }]], false);
            equal([["string!=", { "q": "a" }, { "q": "a" }, { "q": "b" }]], false);
            expect(function() { equal([["string!=", 2, { "q": "2" }]]) }).toThrow();
        });

        it("stringci!=", function () {
            equal([["stringci!=", { "q": "a" }, { "q": "b" }]], true);
            equal([["stringci!=", { "q": "a" }, { "q": "b" }, { "q": "c" }]], true);
            equal([["stringci!=", { "q": "a" }]], true);
            equal([["stringci!="]], true);
            equal([["stringci!=", { "q": "a" }, { "q": "a" }]], false);
            equal([["stringci!=", { "q": "a" }, { "q": "A" }]], false);
            equal([["stringci!=", { "q": "a" }, { "q": "a" }, { "q": "b" }]], false);
            expect(function() { equal([["stringci!=", 2, { "q": "2" }]]) }).toThrow();
        });

        it("string<", function () {
            equal([["string<", { "q": "aaa" }, { "q": "aab" }]], true);
            equal([["string<", { "q": "aaa" }, { "q": "aaaa" }, { "q": "aab" }]], true);
            equal([["string<", { "q": "aaa" }]], true);
            equal([["string<"]], true);
            equal([["string<", { "q": "aaa" }, { "q": "aa" }]], false);
            equal([["string<", { "q": "aaa" }, { "q": "AAB" }]], false);
            equal([["string<", { "q": "aaa" }, { "q": "aaaa" }, { "q": "aaaa" }]], false);
            expect(function() { equal([["string<", 2, { "q": "2" }]]) }).toThrow();
        });

        it("string<=", function () {
            equal([["string<=", { "q": "aaa" }, { "q": "aab" }]], true);
            equal([["string<=", { "q": "aaa" }, { "q": "aaaa" }, { "q": "aab" }]], true);
            equal([["string<=", { "q": "aaa" }, { "q": "aaaa" }, { "q": "aaaa" }]], true);
            equal([["string<=", { "q": "aaa" }]], true);
            equal([["string<="]], true);
            equal([["string<=", { "q": "aaa" }, { "q": "aa" }]], false);
            equal([["string<=", { "q": "aaa" }, { "q": "AAB" }]], false);
            expect(function() { equal([["string<=", 2, { "q": "2" }]]) }).toThrow();
        });

        it("string>", function () {
            equal([["string>", { "q": "aab" }, { "q": "aaa" }]], true);
            equal([["string>", { "q": "aab" }, { "q": "aaaa" }, { "q": "aaa" }]], true);
            equal([["string>", { "q": "aaa" }]], true);
            equal([["string>"]], true);
            equal([["string>", { "q": "aa" }, { "q": "aaa" }]], false);
            equal([["string>", { "q": "AAB" }, { "q": "aaa" }]], false);
            equal([["string>", { "q": "aaaa" }, { "q": "aaaa" }, { "q": "aaa" }]], false);
            expect(function() { equal([["string>", 2, { "q": "2" }]]) }).toThrow();
        });

        it("string>=", function () {
            equal([["string>=", { "q": "aab" }, { "q": "aaa" }]], true);
            equal([["string>=", { "q": "aab" }, { "q": "aaaa" }, { "q": "aaa" }]], true);
            equal([["string>=", { "q": "aaaa" }, { "q": "aaaa" }, { "q": "aaa" }]], true);
            equal([["string>=", { "q": "aaa" }]], true);
            equal([["string>="]], true);
            equal([["string>=", { "q": "aa" }, { "q": "aaa" }]], false);
            equal([["string>=", { "q": "AAB" }, { "q": "aaa" }]], false);
            expect(function() { equal([["string>=", 2, { "q": "2" }]]) }).toThrow();
        });

        it("stringci<", function () {
            equal([["stringci<", { "q": "aaa" }, { "q": "aab" }]], true);
            equal([["stringci<", { "q": "aaa" }, { "q": "AAB" }]], true);
            equal([["stringci<", { "q": "aaa" }, { "q": "aaaa" }, { "q": "aab" }]], true);
            equal([["stringci<", { "q": "aaa" }]], true);
            equal([["stringci<"]], true);
            equal([["stringci<", { "q": "aaa" }, { "q": "aa" }]], false);
            equal([["stringci<", { "q": "aaa" }, { "q": "aaaa" }, { "q": "aaaa" }]], false);
            expect(function() { equal([["stringci<", 2, { "q": "2" }]]) }).toThrow();
        });

        it("stringci<=", function () {
            equal([["stringci<=", { "q": "aaa" }, { "q": "aab" }]], true);
            equal([["stringci<=", { "q": "aaa" }, { "q": "AAB" }]], true);
            equal([["stringci<=", { "q": "aaa" }, { "q": "aaaa" }, { "q": "aab" }]], true);
            equal([["stringci<=", { "q": "aaa" }, { "q": "aaaa" }, { "q": "aaaa" }]], true);
            equal([["stringci<=", { "q": "aaa" }]], true);
            equal([["stringci<="]], true);
            equal([["stringci<=", { "q": "aaa" }, { "q": "aa" }]], false);
            expect(function() { equal([["stringci<=", 2, { "q": "2" }]]) }).toThrow();
        });

        it("stringci>", function () {
            equal([["stringci>", { "q": "aab" }, { "q": "aaa" }]], true);
            equal([["stringci>", { "q": "AAB" }, { "q": "aaa" }]], true);
            equal([["stringci>", { "q": "aab" }, { "q": "aaaa" }, { "q": "aaa" }]], true);
            equal([["stringci>", { "q": "aaa" }]], true);
            equal([["stringci>"]], true);
            equal([["stringci>", { "q": "aa" }, { "q": "aaa" }]], false);
            equal([["stringci>", { "q": "aaaa" }, { "q": "aaaa" }, { "q": "aaa" }]], false);
            expect(function() { equal([["stringci>", 2, { "q": "2" }]]) }).toThrow();
        });

        it("stringci>=", function () {
            equal([["stringci>=", { "q": "aab" }, { "q": "aaa" }]], true);
            equal([["stringci>=", { "q": "AAB" }, { "q": "aaa" }]], true);
            equal([["stringci>=", { "q": "aab" }, { "q": "aaaa" }, { "q": "aaa" }]], true);
            equal([["stringci>=", { "q": "aaaa" }, { "q": "aaaa" }, { "q": "aaa" }]], true);
            equal([["stringci>=", { "q": "aaa" }]], true);
            equal([["stringci>="]], true);
            equal([["stringci>=", { "q": "aa" }, { "q": "aaa" }]], false);
            expect(function() { equal([["stringci>=", 2, { "q": "2" }]]) }).toThrow();
        });

        it("substring", function () {
            equal([["substring", { "q": "abcde" }, 1, 3]], "bc");
            equal([["substring", { "q": "abcde" }, 0, 3]], "abc");
            equal([["substring", { "q": "abcde" }, 3, 3]], "");
            equal([["substring", { "q": "abcde" }, 0, 5]], "abcde");
            expect(function() { equal([["substring", 12345, 1, 3]]) }).toThrow();
            expect(function() { equal([["substring", { "q": "abcde" }, -1, 3]]) }).toThrow();
            expect(function() { equal([["substring", { "q": "abcde" }, 1, -3]]) }).toThrow();
            expect(function() { equal([["substring", { "q": "abcde" }, 4, 3]]) }).toThrow();
        });

        it("concat", function () {
            equal([["concat", { "q": [1, 2] }, { "q": [3] }, { "q": [4, 5] }]], [1, 2, 3, 4, 5]);
            equal([["concat", { "q": [1, 2] }]], [1, 2]);
            equal([["concat"]], []);
            expect(function() { equal([["concat", { "q": "abcde" }, { "q": [3] }]]) }).toThrow();
            expect(function() { equal([["concat", { "q": { "0": 1, "1": 2 } }, { "q": [3] }]]) }).toThrow();
            expect(function() { equal([["concat", 1, { "q": [3] }]]) }).toThrow();
        });

        it("error", function () {
            expect(function() { equal([["error", { "q": "abcde" }]]) }).toThrow();
            expect(function() { equal([["error", 1]]) }).toThrow();
        });

        it("functionp", function () {
            equal([["functionp", "add"]], true);
            equal([["functionp", "functionp"]], true);
            equal([["functionp", {
                "function": {
                    "args": [],
                    "begin": [["add", 1, 2]]
                }
            }]], true);
            equal([["callcc", {
                "function": {
                    "args": ["k"],
                    "begin": [["functionp", "k"]]
                }
            }]], true);
            equal([["functionp", 1]], false);
            equal([["functionp", 1.2]], false);
            equal([["functionp", { "q": "2" }]], false);
            equal([["functionp", { "q": [1] }]], false);
            equal([["functionp", { "q": { "aaaa": 1 } }]], false);
            equal([["functionp", null]], false);
            equal([["functionp", true]], false);
            equal([["functionp", false]], false);
        });

        it("values", function () {
            equal([[["values", 1, 2, 3], 1]], 2);
        });

        it("apply", function () {
            equal([["apply", "sub", ["list", 4, 3, 2, 1]]], -2);
            expect(function() { equal([["apply", { "q": "abcde" }, ["list", 4, 3, 2, 1]]]) }).toThrow();
            expect(function() { equal([["apply", "sub", { "q": "abcde" }]]) }).toThrow();
        });

        it("arraymap", function () {
            equal([["arraymap", "sub", ["list", 4, 3, 2, 1]]], [-4, -3, -2, -1]);
            equal([["arraymap", "sub", ["list", 4, 3, 2, 1], ["list", 7, 5, 3, 1], ["list", 3, 2, 1]]], [-6, -4, -2]);
            expect(function() { equal([["arraymap", { "q": "abcde" }, ["list", 4, 3, 2, 1]]]) }).toThrow();
            expect(function() { equal([["arraymap", "sub", ["list", 4, 3, 2, 1], { "q": "abcde" }]]) }).toThrow();
            expect(function() { equal([["arraymap", "add"]]) }).toThrow();
        });

        it("objectmap", function () {
            equal([["objectmap", "sub", { "q": { "a": 1, "b": 2 } }]], { "a": -1, "b": -2 });
            expect(function() { equal([["objectmap", { "q": "abcde" }, ["list", 4, 3, 2, 1]]]) }).toThrow();
            expect(function() { equal([["objectmap", "sub", { "q": "abcde" }]]) }).toThrow();
            expect(function() { equal([["objectmap", "add"]]) }).toThrow();
        });

        it("gensym", function () {
            equal([
                {
                    "defmacro": {
                        "name": "aaaa",
                        "patterns": [
                            {
                                "pattern": {
                                    "bbbb": "a"
                                },
                                "begin": [
                                    {
                                        "let": {
                                            "vars": {
                                                "sym": ["gensym"]
                                            },
                                            "begin": [
                                                {
                                                    "qq": [
                                                        {
                                                            "function": {
                                                                "args": [{ "uq": "sym" }],
                                                                "begin": [
                                                                    ["+", { "uq": "sym" }, { "uq": "a" }]
                                                                ]
                                                            }
                                                        },
                                                        346
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                },
                {
                    "aaaa": {
                        "bbbb": 765
                    }
                }
            ], 1111);
        });
    });
});
