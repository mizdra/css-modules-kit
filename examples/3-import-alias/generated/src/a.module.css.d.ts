// @ts-nocheck
declare const styles = {
  ...(await import('@/src/b.module.css')).default,
  ...(await import('#src/b.module.css')).default,
};
export default styles;
