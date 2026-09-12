'use strict';

class PortalError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'PortalError';
    this.status = status;
    this.code = code;
  }
}

function portalError(status, code, message) { return new PortalError(status, code, message); }

module.exports = { portalError, PortalError };
