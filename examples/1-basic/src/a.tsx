import styles from './a.module.css';

styles.a_1;
styles.a_2;
styles.a_3;
styles.a_4;
styles.b_1;
styles.b_2;
styles.c_1;
styles.c_alias;
styles.unknown; // Expected TS2339 error

const jsx = (
  <div></div>
  //  ^ Try completing className prop. It should insert `className={}`.
)
