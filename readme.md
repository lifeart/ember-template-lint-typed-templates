# ember-template-lint-typed-templates 🌬

## Install

```sh
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
