// @ts-nocheck
function blockErrorType<T>(val: T): [0] extends [(1 & T)] ? {} : T;
declare const styles = {
  'a_1': '' as string,
  'a_2': '' as string,
  'a_2': '' as string,
  'a_3': '' as string,
  'a_4': '' as string,
  'a_5': '' as string,
  ...blockErrorType((await import('./b.module.css')).default),
  'c_1': (await import('./c.module.css')).default['c_1'],
  'c_alias': (await import('./c.module.css')).default['c_2'],
} as const;
export default styles;
