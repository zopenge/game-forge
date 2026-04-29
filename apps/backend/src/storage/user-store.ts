import { createIdGenerator } from '@game-forge/identity';

import type { UserRecord } from '../types/domain';

export interface UserStore {
  findById(userId: string): UserRecord | undefined;
  findByUsername(username: string): UserRecord | undefined;
  getOrCreateByUsername(username: string): UserRecord;
}

export const createUserStore = (): UserStore => {
  const idGenerator = createIdGenerator('user');
  const usersById = new Map<string, UserRecord>();
  const userIdsByUsername = new Map<string, string>();

  return {
    findById: (userId) => usersById.get(userId),
    findByUsername: (username) => {
      const userId = userIdsByUsername.get(username);

      return userId ? usersById.get(userId) : undefined;
    },
    getOrCreateByUsername: (username) => {
      const existingUserId = userIdsByUsername.get(username);

      if (existingUserId) {
        const existingUser = usersById.get(existingUserId);

        if (existingUser) {
          return existingUser;
        }
      }

      const user = {
        userId: idGenerator.next(),
        username
      } satisfies UserRecord;

      usersById.set(user.userId, user);
      userIdsByUsername.set(username, user.userId);

      return user;
    }
  };
};
