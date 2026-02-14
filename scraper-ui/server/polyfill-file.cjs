/**
 * Polyfill for global File (Node 18.17 and earlier).
 * Undici expects global File; Node 20+ has it, Node 18.17 does not.
 * Load this first in the server entry so undici does not throw "File is not defined".
 */
'use strict';

if (typeof globalThis.File === 'undefined') {
  const { Blob } = require('buffer');
  class File extends Blob {
    constructor(bits, name, opts) {
      super(bits, opts || {});
      this.name = name || '';
      this.lastModified = (opts && opts.lastModified) != null ? opts.lastModified : Date.now();
    }
  }
  globalThis.File = File;
}
