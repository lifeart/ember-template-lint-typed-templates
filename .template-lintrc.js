'use strict';

module.exports = {
  plugins: [
    {
        name: "ember-template-lint-plugin-typed-templates",
        rules: {
          'typed-templates': require('./index.js')
        }
    }
  ],
  rules: {
    "typed-templates": "on"
  },
  extends: []
};