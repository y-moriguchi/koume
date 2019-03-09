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
});
