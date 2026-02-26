import "reflect-metadata";

export {
  Injectable,
  Inject,
  InjectContainer,
  useService,
  createScope,
} from "./di.decorators";
export { Container, container, Token, token } from "./container";
export type {
  Scope,
  InjectableOptions,
  Constructor,
  ServiceDescriptor,
} from "./container";
