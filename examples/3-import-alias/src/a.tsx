import styles from './a.module.css';
styles.b_1;
styles.unknown; // Expected TS2339 error, but `tsc` does not report it because of https://github.com/mizdra/css-modules-kit/issues/133
