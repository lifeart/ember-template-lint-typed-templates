"use strict";
module.exports = {
    name: "ember-template-lint-typed-templates",
    rules: {
        "typed-templates": require("./rule")
    },
    configurations: {
        recommended: {
            rules: {
                "typed-templates": "error"
            }
        }
    }
};

