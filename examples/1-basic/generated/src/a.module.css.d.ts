// @ts-nocheck
function blockErrorType<T>(val: T): [0] extends [(1 & T)] ? {} : T;
declare const styles = {
  a_1: '' as readonly string,
  a_2: '' as readonly string,
  a_2: '' as readonly string,
  a_3: '' as readonly string,
  a_4: '' as readonly string,
  ...blockErrorType((await import('./b.module.css')).default),
  c_1: (await import('./c.module.css')).default.c_1,
  c_alias: (await import('./c.module.css')).default.c_2,
};
export default styles;
