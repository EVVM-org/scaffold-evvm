/**
 * Shared UI primitives.
 *
 * All components consume the design tokens defined in
 * `src/styles/globals.css` (populated by the ui-ux-pro-max audit at
 * `design-system/scaffold-evvm/MASTER.md`). Use these in new code instead
 * of hand-rolling button/card/input markup per page.
 */

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export { Card, CardHeader, CardBody, CardFooter } from './Card';
export { Input, type InputProps } from './Input';
export { Select, type SelectProps, type SelectOption } from './Select';
export { Badge, type BadgeVariant, type BadgeSize } from './Badge';
export { Code, CodeBlock } from './Code';
export { EmptyState } from './EmptyState';
export { Skeleton } from './Skeleton';
export { Stat, StatGroup } from './Stat';
