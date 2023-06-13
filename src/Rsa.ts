import {
  get32IntFromBuffer,
  guardError,
  isNumber,
  isObject,
  isString,
  trimSurroundingText,
} from "./utils";
import { Buffer } from "buffer";
import { BerReader } from "asn1";
import { BigInteger } from "./jsbn";
import crypto from "crypto";

const PUBLIC_OPENING_BOUNDARY = "-----BEGIN PUBLIC KEY-----";
const PUBLIC_CLOSING_BOUNDARY = "-----END PUBLIC KEY-----";
var PUBLIC_RSA_OID = "1.2.840.113549.1.1.1";

type ICache = {
  keyBitLength: number;
  keyByteLength: number;
};

export class Rsa {
  private nHex!: InstanceType<typeof BigInteger>;
  private eHex!: number;
  private cache = {} as ICache;

  constructor(private readonly key: string) {
    this.autoImport(key);
  }

  public encrypt<D>(data: D, encoding: BufferEncoding) {
    const buffer = this.getDataForEncrypt(data, encoding)!;
    const buffers: Buffer[] = [];
    const results: any[] = [];
    const bufferSize = buffer.length;
    const buffersCount = Math.ceil(bufferSize / this.maxMessageLength()) || 1;
    const dividedSize = Math.ceil(bufferSize / buffersCount || 1);

    if (buffersCount == 1) {
      buffers.push(buffer);
    } else {
      for (let bufNum = 0; bufNum < buffersCount; bufNum++) {
        buffers.push(
          buffer.slice(bufNum * dividedSize, (bufNum + 1) * dividedSize)
        );
      }
    }

    for (let i = 0; i < buffers.length; i++) {
      results.push(this.encryption(buffers[i]));
    }

    return Buffer.concat(results);
  }

  private maxMessageLength() {
    return this.cache.keyByteLength - 2 * 20 - 2;
  }

  private getDataForEncrypt<D>(data: D, encoding: BufferEncoding = "utf8") {
    if (isString(data) || isNumber(data)) {
      return Buffer.from("" + data, encoding);
    }
    if (Buffer.isBuffer(data)) {
      return data;
    }
    if (isObject(data)) {
      return Buffer.from(JSON.stringify(data));
    }
    guardError(true, "Unexpected data type");
  }

  private encryption(buffer: Buffer) {
    const m = new BigInteger(this.encPad(buffer));
    const c = m.modPowInt(this.eHex, this.nHex);

    return (c as any).toBuffer(this.cache.keyByteLength);
  }

  private encPad(buffer: Buffer) {
    const hash = "sha1";
    const label = Buffer.alloc(0);
    const emLen = 128;
    const hLen = 20;

    guardError(
      buffer.length > emLen - 2 * hLen - 2,
      "Message is too long to encode"
    );

    let lHash = crypto.createHash(hash);
    lHash.update(label);
    lHash = lHash.digest() as any;

    const PS = Buffer.alloc(emLen - buffer.length - 2 * hLen - 1); // Padding "String"
    PS.fill(0); // Fill the buffer with octets of 0
    PS[PS.length - 1] = 1;

    const DB = Buffer.concat([lHash as any, PS, buffer]);
    const seed = crypto.randomBytes(hLen);

    // mask = dbMask
    let mask = this.mgf(seed, DB.length, hash);
    let i: number;
    // XOR DB and dbMask together.
    for (i = 0; i < DB.length; i++) {
      DB[i] ^= mask[i];
    }
    // DB = maskedDB

    // mask = seedMask
    mask = this.mgf(DB, hLen, hash);
    // XOR seed and seedMask together.
    for (i = 0; i < seed.length; i++) {
      seed[i] ^= mask[i];
    }
    // seed = maskedSeed

    const em = Buffer.alloc(1 + seed.length + DB.length);
    em[0] = 0;
    seed.copy(em, 1);
    DB.copy(em, 1 + seed.length);

    return em;
  }

  private mgf(seed: any, maskLength: number, hashFunction = "sha1") {
    const hLen = 20;
    const count = Math.ceil(maskLength / hLen);
    const T = Buffer.alloc(hLen * count);
    const c = Buffer.alloc(4);
    for (let i = 0; i < count; ++i) {
      const hash = crypto.createHash(hashFunction);
      hash.update(seed);
      c.writeUInt32BE(i, 0);
      hash.update(c);
      hash.digest().copy(T, i * hLen);
    }
    return T.slice(0, maskLength);
  }

  private autoImport(key: string) {
    guardError(!key, "missing key!");

    const publicRx =
      /^[\S\s]*-----BEGIN PUBLIC KEY-----\s*(?=(([A-Za-z0-9+/=]+\s*)+))\1-----END PUBLIC KEY-----[\S\s]*$/g;
    if (publicRx.test(key)) {
      this.publicImport();
    }
  }

  private publicImport() {
    const pem = trimSurroundingText(
      this.key,
      PUBLIC_OPENING_BOUNDARY,
      PUBLIC_CLOSING_BOUNDARY
    ).replace(/\s+|\n\r|\n|\r$/gm, "");
    const buffer = Buffer.from(pem, "base64");
    const reader = new BerReader(buffer);
    reader.readSequence();

    const header = new BerReader(reader.readString(0x30, true));

    guardError(
      header.readOID(0x06) !== PUBLIC_RSA_OID,
      "Invalid Public key format"
    );

    const body = new BerReader(reader.readString(0x03, true));
    body.readByte(false);
    body.readSequence();
    this.setPublic(body.readString(0x02, true), body.readString(0x02, true));
  }

  private setPublic(N: Buffer, E: Buffer) {
    guardError(
      !(N && E && N.length > 0 && (isNumber(E) || E.length > 0)),
      "Invalid RSA public key!"
    );

    this.nHex = new BigInteger(N);
    this.eHex = (isNumber(E) ? E : get32IntFromBuffer(E)) as number;

    this.cache = {
      keyBitLength: this.nHex.bitLength(),
      keyByteLength: (this.cache.keyBitLength + 6) >> 3,
    };
  }
}
