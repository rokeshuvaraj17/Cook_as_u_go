'use strict';

let schemaReady = false;
/** @type {Error|null} */
let initError = null;

function setDbSchemaReady(ok, error = null) {
  schemaReady = Boolean(ok);
  initError = error || null;
}

function isDbSchemaReady() {
  return schemaReady;
}

function getDbInitError() {
  return initError;
}

module.exports = {
  setDbSchemaReady,
  isDbSchemaReady,
  getDbInitError,
};
