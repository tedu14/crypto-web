import { BigInteger as BigInt } from "jsbn";
import { Buffer } from "buffer";
import { isNumber } from "./utils";

export class BigInteger extends BigInt {
  constructor(a: any, b?: any) {
    if (a !== null) {
      super(a, Buffer.isBuffer(a) ? 256 : b);
    }
  }

  public toBuffer<T>(trimOrSize: T) {
    let res = Buffer.from(this.toByteArray());
    if (trimOrSize === true && res[0] === 0) {
      return res.slice(1);
    }
    if (!isNumber(trimOrSize)) {
      return res;
    }
    const trimSize = trimOrSize as number;

    if (res.length > trimSize) {
      for (let i = 0; i < res.length - trimSize; i++) {
        if (res[i] !== 0) {
          return null;
        }
      }
      return res.slice(res.length - trimSize);
    }

    if (res.length < trimSize) {
      let padded = Buffer.alloc(trimSize);
      padded.fill(0, 0, trimSize - res.length);
      res.copy(padded, trimSize - res.length);
      return padded;
    }

    return res;
  }
}
