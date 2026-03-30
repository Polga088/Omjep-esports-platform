/**
 * Framer Motion reserves several DOM event names — omit from native types when
 * spreading props onto `motion.*` to avoid incompatible handler signatures.
 */
export type MotionConflictKeys =
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onDragOver'
  | 'onDragEnter'
  | 'onDragLeave'
  | 'onDrop'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration';

export type OmitMotionConflicts<T> = Omit<T, MotionConflictKeys>;
