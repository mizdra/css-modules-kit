// @ts-nocheck
function blockErrorType<T>(val: T): [0] extends [(1 & T)] ? {} : T;
declare const styles = {
  'a_1': '' as string,
  'a_2': '' as string,
  'a_2': '' as string,
  'a_3': '' as string,
  'keyframe': '' as string,
  '--custom-property': '' as string,
  '--property': '' as string,
  '--custom-media': '' as string,
  '--font-palette': '' as string,
  '--position-try': '' as string,
  '--anchor': '' as string,
  '--view-timeline': '' as string,
  '--scroll-timeline': '' as string,
  'container': '' as string,
  ...blockErrorType((await import('./b.module.css')).default),
  'c_1': (await import('./c.module.css')).default['c_1'],
  'c_alias': (await import('./c.module.css')).default['c_2'],
} as const;
export default styles;
