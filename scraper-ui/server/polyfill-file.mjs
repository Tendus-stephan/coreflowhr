/**
 * Node 18.17: polyfill global File before undici loads.
 * Must be imported first (ESM hoists imports) so no other module loads undici before this runs.
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
