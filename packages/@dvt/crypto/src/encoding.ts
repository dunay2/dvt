const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function utf8Bytes(text: string): Uint8Array {
  if (typeof text !== 'string') {
    throw new TypeError('CRYPTO_UTF8_TEXT_REQUIRED');
  }

  return new globalThis.TextEncoder().encode(text);
}

export function base64Bytes(text: string): Uint8Array {
  if (typeof text !== 'string' || !BASE64_PATTERN.test(text)) {
    throw new TypeError('CRYPTO_BASE64_TEXT_INVALID');
  }
  if (text.length === 0) {
    return new Uint8Array();
  }

  const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
  const output = new Uint8Array((text.length / 4) * 3 - padding);
  let outputIndex = 0;

  for (let index = 0; index < text.length; index += 4) {
    const first = BASE64_ALPHABET.indexOf(text.charAt(index));
    const second = BASE64_ALPHABET.indexOf(text.charAt(index + 1));
    const thirdChar = text.charAt(index + 2);
    const fourthChar = text.charAt(index + 3);
    const third = thirdChar === '=' ? 0 : BASE64_ALPHABET.indexOf(thirdChar);
    const fourth = fourthChar === '=' ? 0 : BASE64_ALPHABET.indexOf(fourthChar);

    if (first < 0 || second < 0 || third < 0 || fourth < 0) {
      throw new TypeError('CRYPTO_BASE64_TEXT_INVALID');
    }

    const value = (first << 18) | (second << 12) | (third << 6) | fourth;
    if (outputIndex < output.length) {
      output[outputIndex] = (value >>> 16) & 0xff;
      outputIndex += 1;
    }
    if (outputIndex < output.length) {
      output[outputIndex] = (value >>> 8) & 0xff;
      outputIndex += 1;
    }
    if (outputIndex < output.length) {
      output[outputIndex] = value & 0xff;
      outputIndex += 1;
    }
  }

  return output;
}

export function requireBytes(bytes: Uint8Array): Uint8Array {
  if (
    !ArrayBuffer.isView(bytes) ||
    Object.prototype.toString.call(bytes) !== '[object Uint8Array]'
  ) {
    throw new TypeError('CRYPTO_BYTES_REQUIRED');
  }

  return bytes;
}
