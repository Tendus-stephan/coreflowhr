/**
 * Node 18.17: polyfill global File before undici loads.
 * Import this first in any entry that uses apify-client/undici.
 */
import { Blob } from 'node:buffer';

if (typeof globalThis.File === 'undefined') {
  class File extends Blob {
    constructor(bits, name, opts) {
      super(bits, opts || {});
      this.name = name || '';
      this.lastModified = (opts && opts.lastModified) != null ? opts.lastModified : Date.now();
    }
  }
  globalThis.File = File;
}
