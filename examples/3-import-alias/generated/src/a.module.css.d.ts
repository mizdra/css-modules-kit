// @ts-nocheck
function blockErrorType<T>(val: T): [0] extends [(1 & T)] ? {} : T;
declare const styles = {
  ...blockErrorType((await import('@/src/b.module.css')).default),
  ...blockErrorType((await import('#src/b.module.css')).default),
};
export default styles;
