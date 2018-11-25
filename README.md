# Koume
Koume is a programming language described by JSON.  
Koume has features as follows.
* first class functions and anonymous functions
* first class continuations
* tail recursion optimization
* LISP like macros
* message passing mechanism

## How to use

### node.js
Install Koume:
```
npm install koume
```

Use module:
```js
var Koume = require('koume');
```

### Browser
```html
<script src="koume.js"></script>
```

### Command Line
```
$ koume [-n] program.json
```

## Examples

### Literals
```json
[ 765 ]
[ true ]
[ false ]
[ null ]
```

### Apply to function
```json
[ "add", 765, 346 ]
```

### Quotes
```json
[ { "q": "string" } ]
[ { "q": [ "array" ] } ]
[ { "q": { "obj1": 1 } } ]
```

### Quasiquotes
```json
[
  {
    "qq": {
      "obj1": {
        "uq": [ "add", 765, 346 ]
      }
    }
  }
]
```

### Functions
```json
[
  {
    "define": {
      "square": {
        "function": {
          "args": ["x"],
          "begin": [
            ["mul", "x", "x"]
          ]
        }
      }
    }
  }
]
```

### Conditions
```json
[
  {
    "if": {
      "cond": true,
      "then": 1,
      "else": 2
    }
  }
]
```

### Loop (named let)
```json
[
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
]
```

### Continuations
```json
[
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
]
```

### Macros
```json
[
  {
    "defmacro": {
      "name": "aMacro",
      "patterns": [
        {
          "pattern": {
            "obj1": "a"
          },
          "begin": [
            {
              "qq": ["list", { "uq": "a" }]
            }
          ]
        }
      ]
    }
  },
  {
    "aMacro": {
      "obj1": 1
    }
  }
]
```

### Message passing
```json
[
  {
    "define": {
      "class": {
        "function": {
          "args": ["x"],
          "begin": [
            {
              "message": {
                "extends": false,
                "messages": {
                  "add": {
                    "function": {
                      "args": ["y"],
                      "begin": [
                        ["add", "x", "y"]
                      ]
                    }
                  }
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    "define": {
      "obj": ["class", 765]
    }
  },
  [["obj", { "q": "add" }], 346]
]
```

## Document
[A document of Koume is here (Japanese).](http://koume.morilib.net)
