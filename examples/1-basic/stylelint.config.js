/** @type {import('stylelint').Config} */
export default {
  extends: ['@css-modules-kit/stylelint-plugin/recommended'],
  rules: {
    'at-rule-no-unknown': true,
    'property-no-unknown': true,
  },
};
