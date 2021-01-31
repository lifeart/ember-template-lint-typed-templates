const generateRuleTests = require("ember-template-lint/lib/helpers/rule-test-harness");

// default config
generateRuleTests({
  name: "typed-templates",

  groupMethodBefore: beforeEach,
  groupingMethod: describe,
  testMethod: it,
  plugins: [
    {
      name: "ember-template-lint-plugin-typed-templates",
      rules: {
        'typed-templates': require('./../../index.js')
      }
    }
  ],
  config: {},

  bad: [
    {
      template: "<div class='md:flex bg-white foo rounded-lg p-2'></div>",
      meta: {
        filePath: 'app/components/foo-bar/index.hbs',
      },
      results: [
        {
          column: 6,
          filePath: 'layout.hbs',
          line: 1,
          message: "Property 'b' does not exist on type 'FooBarComponentTemplate'.",
          moduleId: 'layout',
          rule: 'typed-templates',
          severity: 2
        },
        {
          column: 7,
          filePath: 'layout.hbs',
          line: 2,
          message: "Property 'n' does not exist on type '{}'.",
          moduleId: 'layout',
          rule: 'typed-templates',
          severity: 2
        }
      ]
    },
  ],
});