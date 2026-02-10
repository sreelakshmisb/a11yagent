declare module "tail" {
  export class Tail {
    constructor(filename: string, options?: TailOptions);
    on(event: "line", listener: (data: string) => void): void;
    on(event: "error", listener: (error: Error) => void): void;
    unwatch(): void;
    // tail-augment.d.ts
  }

  export interface TailOptions {
    separator?: RegExp | string;
    fromBeginning?: boolean;
    follow?: boolean;
    fsWatchOptions?: object;
    logger?: object;
    useWatchFile?: boolean;
  }
}
