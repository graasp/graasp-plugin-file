// global
import { FastifyLoggerInstance } from 'fastify';
import {
  Task,
  TaskStatus,
  Actor,
  DatabaseTransactionHandler,
  PreHookHandlerType,
  PostHookHandlerType,
} from 'graasp';
import FileService from '../fileServices/interface/fileService';

export abstract class BaseTask<R> implements Task<Actor, R> {
  protected _result: R;
  protected _message: string;

  protected fileService: FileService;

  readonly actor: Actor;

  status: TaskStatus;
  targetId: string;

  preHookHandler?: PreHookHandlerType<R>;
  postHookHandler?: PostHookHandlerType<R>;

  constructor(actor: Actor, fileService) {
    this.fileService = fileService;
    this.actor = actor;
    this.status = 'NEW';
  }

  abstract get name(): string;
  get result(): R {
    return this._result;
  }
  get message(): string {
    return this._message;
  }

  getResult?: () => unknown;

  abstract run(
    handler: DatabaseTransactionHandler,
    log: FastifyLoggerInstance,
  ): Promise<void | BaseTask<R>[]>;
}
