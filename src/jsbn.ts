import { BigInteger as BigInt } from "jsbn";
import { Buffer } from "buffer";

export class BigInteger extends BigInt {
  constructor(a: any, b?: any) {
    if (a !== null) {
      super(a, Buffer.isBuffer(a) ? 256 : b);
    }
  }
}
