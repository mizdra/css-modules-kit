/** @type {import('stylelint').Config} */
export default {
  extends: ['@css-modules-kit/stylelint-plugin/config'],
  rules: {
    'at-rule-no-unknown': true,
    'property-no-unknown': true,
    //   'css-modules-kit/no-unused-class-names': true,
    //   'css-modules-kit/no-missing-component-file': true,
  },
};
