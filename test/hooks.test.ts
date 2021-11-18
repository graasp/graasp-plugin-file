import {
  TaskRunner,
  ItemTaskManager,
  ItemMembershipTaskManager,
} from 'graasp-test';
import { v4 } from 'uuid';
import build from './app';
import {
  DISABLE_S3,
  ENABLE_S3,
  GRAASP_ACTOR,
  ITEM_S3_KEY,
  ROOT_PATH,
} from './constants';
import { mimetype, SIZES } from '../src/utils/constants';
import { LocalService } from '../src/fileProviders/LocalService';
import { S3Provider } from '../src/fileProviders/s3Provider';
import { createFsFolder } from '../src/utils/helpers';

const taskManager = new ItemTaskManager();
const runner = new TaskRunner();
const membership = new ItemMembershipTaskManager();

describe('Test hooks', () => {
  describe('Test File System hooks', () => {
    it('Copy corresponding file on copy task', (done) => {
      const copy = jest.spyOn(LocalService.prototype, 'copyFile');

      jest
        .spyOn(runner, 'setTaskPostHookHandler')
        .mockImplementation(async (name, fn) => {
          if (name === taskManager.getCopyTaskName()) {
            const item = { id: v4() };
            const actor = GRAASP_ACTOR;
            await fn(item, actor, { log: undefined }, { original: item });
            expect(copy).toHaveBeenCalledTimes(SIZES.length);
            done();
          }
        });

      build({
        taskManager,
        runner,
        membership,
        options: { ...DISABLE_S3, enableItemsHooks: true },
      });
    });

    it('Delete corresponding file on delete task', (done) => {
      const deletefunc = jest.spyOn(LocalService.prototype, 'deleteFile');

      jest
        .spyOn(runner, 'setTaskPostHookHandler')
        .mockImplementation(async (name, fn) => {
          if (name === taskManager.getDeleteTaskName()) {
            const item = { id: v4() };
            const actor = GRAASP_ACTOR;
            await fn(item, actor, { log: undefined }, { original: item });
            expect(deletefunc).toHaveBeenCalled();
            done();
          }
        });

      build({
        taskManager,
        runner,
        membership,
        options: { ...DISABLE_S3, enableItemsHooks: true },
      });
    });

    it('Creating image should call post hook', (done) => {
      const getObject = jest.spyOn(LocalService.prototype, 'getObject');

      jest
        .spyOn(runner, 'setTaskPostHookHandler')
        .mockImplementation(async (name, fn) => {
          if (name === taskManager.getCreateTaskName()) {
            const item = {
              id: v4(),
              type: 'file',
              extra: { file: { mimetype, path: `${ITEM_S3_KEY}/small` } },
            };
            const actor = GRAASP_ACTOR;
            await fn(item, actor, { log: undefined });
            expect(getObject).toHaveBeenCalled();
            done();
          }
        });

      build({
        taskManager,
        runner,
        membership,
        options: { ...DISABLE_S3, enableItemsHooks: true },
      });
    });
  });

  describe('Test S3 hooks', () => {
    it('Copy corresponding file on copy task', (done) => {
      const copy = jest.spyOn(S3Provider.prototype, 'copyFile');

      jest
        .spyOn(runner, 'setTaskPostHookHandler')
        .mockImplementation(async (name, fn) => {
          if (name === taskManager.getCopyTaskName()) {
            const item = { id: v4() };
            const actor = GRAASP_ACTOR;
            await fn(item, actor, { log: undefined }, { original: item });
            expect(copy).toHaveBeenCalledTimes(SIZES.length);
            done();
          }
        });

      build({
        taskManager,
        runner,
        membership,
        options: { ...ENABLE_S3, enableItemsHooks: true },
      });
    });

    it('Delete corresponding file on delete task', (done) => {
      const deletefunc = jest.spyOn(S3Provider.prototype, 'deleteFile');

      jest
        .spyOn(runner, 'setTaskPostHookHandler')
        .mockImplementation(async (name, fn) => {
          if (name === taskManager.getDeleteTaskName()) {
            const item = { id: v4() };
            const actor = GRAASP_ACTOR;
            await fn(item, actor, { log: undefined }, { original: item });
            expect(deletefunc).toHaveBeenCalled();
            done();
          }
        });

      build({
        taskManager,
        runner,
        membership,
        options: { ...ENABLE_S3, enableItemsHooks: true },
      });
    });
  });
});
