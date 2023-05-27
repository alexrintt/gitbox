import { ApplicationState } from ".";

// Switch statements does not allows const re-declaration.
export function withScope<T>(fn: () => T): T {
  return fn();
}

export type Err = {
  message: string;
  code: string;
};

export type Maybe<T> = T | undefined;

export type StateSelector<T> = (state: ApplicationState) => T;
