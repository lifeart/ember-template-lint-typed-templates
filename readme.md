# ember-template-lint-typed-templates 🌬


Based on [els-addon-typed-templates](https://github.com/lifeart/els-addon-typed-templates) and [@lifeart/ember-language-server](https://github.com/lifeart/ember-language-server)

## Require

```
ember-template-lint >= 3.0
els-addon-typed-templates >= 4.0.2
```

## Install

```sh
yarn add -D els-addon-typed-templates
yarn add -D ember-template-lint-typed-templates
```

```js
// .template-lintrc.js
module.exports = {
  plugins: ['ember-template-lint-typed-templates'],
};
```

## Recommended configuration

A recommended configuration is available. To use it, merge the following object to your `.template-lintrc.js` file:

```js
// .template-lintrc.js
module.exports = {
  plugins: ['ember-template-lint-typed-templates'],
  extends: [
    'octane', // this comes from ember-template-lint
    'ember-template-lint-typed-templates:recommended'
  ]
};
```
