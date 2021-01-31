'use strict';

module.exports = {
  plugins: [
    {
        name: "ember-template-lint-typed-templates",
        rules: {
          'typed-templates': require('./rule.js')
        }
    }
  ],
  rules: {
    "typed-templates": "on"
  },
  extends: []
};