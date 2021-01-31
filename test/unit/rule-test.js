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
      result: {
        moduleId: "layout",
        message:
          "HTML class attribute sorting is: 'md:flex bg-white foo rounded-lg p-2', but should be: 'foo p-2 bg-white rounded-lg md:flex'",
        line: 1,
        column: 5,
        isFixable: true,
        source: "<div class='md:flex bg-white foo rounded-lg p-2'></div>",
      },
    },
  ],
});