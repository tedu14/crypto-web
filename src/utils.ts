export function guardError(conditional: boolean, message: string) {
  if (conditional) throw new Error(message);
}

export function trimSurroundingText(
  data: string,
  opening: string,
  closing: string
) {
  var trimStartIndex = 0;
  var trimEndIndex = data.length;

  var openingBoundaryIndex = data.indexOf(opening);
  if (openingBoundaryIndex >= 0) {
    trimStartIndex = openingBoundaryIndex + opening.length;
  }

  var closingBoundaryIndex = data.indexOf(closing, openingBoundaryIndex);
  if (closingBoundaryIndex >= 0) {
    trimEndIndex = closingBoundaryIndex;
  }

  return data.substring(trimStartIndex, trimEndIndex);
}

export function isNumber(value: any) {
  return (
    typeof value == "number" || (!isNaN(parseFloat(value)) && isFinite(value))
  );
}

export function get32IntFromBuffer(buffer: Buffer, offset = 0) {
  let size = 0;
  if ((size = buffer.length - offset) > 0) {
    if (size >= 4) {
      return buffer.readUIntBE(offset, size);
    } else {
      let res = 0;
      for (let i = offset + size, d = 0; i > offset; i--, d += 2) {
        res += buffer[i - 1] * Math.pow(16, d);
      }
      return res;
    }
  } else {
    return NaN;
  }
}

export function isString(value: any) {
  return typeof value == "string" || value instanceof String;
}

export function isObject(value: any) {
  const typeValue = typeof value;
  return !!value && (typeValue === "object" || typeValue === "function");
}
