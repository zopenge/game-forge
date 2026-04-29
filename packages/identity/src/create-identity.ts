export interface IdGenerator {
  next(): string;
}

export const createIdGenerator = (prefix = 'id'): IdGenerator => {
  let counter = 0;

  return {
    next: () => {
      counter += 1;
      return `${prefix}-${counter.toString().padStart(4, '0')}`;
    }
  };
};

export const createSessionId = (prefix = 'session') =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
