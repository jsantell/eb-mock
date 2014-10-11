
/**
 * Takes a callback, error, and response object. Calls `fn` with appropriate error/response
 * set ups, similar to what AWS adds.
 *
 * @param {Function} fn
 * @param {Object} err
 * @param {Object} res
 */

function respond (fn, err, res) {
  res = res || {};
  res.ResponseMetadata = { RequestId: generateUUID() };
  setTimeout(function () {
    fn(err || null, err ? null : Object.freeze(res));
  }, 0);
}
exports.respond = respond;

function removeFromList (array, obj) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === obj) {
      array.splice(i, 1);
    }
    return;
  }
}
exports.removeFromList = removeFromList;

function findWhere (array, obj) {
  var props = Object.keys(obj);
  for (var i = 0; i < array.length; i++) {
    var passable = true;
    for (var j = 0; j < props.length; j++) {
      if (array[i][props[j]] !== obj[props[j]]) {
        passable = false;
      }
    }
    if (passable)
      return array[i];
  }
  return null;
}
exports.findWhere = findWhere;

/**
 * Generates a UUID-like string.
 *
 * @return {String}
 */

function generateUUID () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

/**
 * Shallow clone of an object.
 *
 * @param {Object} obj
 * @return {Object}
 */

function copy (obj) {
  var dupe = {};
  for (var key in obj) {
    dupe[key] = object[key];
  }
  return dupe;
}

/**
 * Merges properties of obj2 into obj1.
 *
 * @param {Object} obj1
 * @param {Object} obj2
 * @return {Object}
 */

function update (obj1, obj2) {
  Object.keys(obj2).forEach(function (prop) {
    obj1[prop] = obj2[prop];
  });
  return obj1;
}

/**
 * Creates an Error similar to the aws-sdk module. Logic taken
 * from `AWS.util.error`.
 *
 * @param {Error} err
 * @param {Object} options
 * @return {Error}
 */

function createError (err, options) {
  var originalError = null;
  if (typeof err.message === "string" && err.message !== "") {
    if (typeof options === "string" || (options && options.message)) {
      originalError = copy(err);
      originalError.message = err.message;
    }
  }
  err.message = err.message || null;

  if (typeof options === "string") {
    err.message = options;
  } else {
    update(err, options);
  }

  Object.defineProperty(err, "name", { writable: true, enumerable: false });
  Object.defineProperty(err, "message", { enumerable: true });

  err.name = err.name || err.code || "Error";
  err.time = new Date();

  if (originalError)
    error.originalError = originalError;

  return err;
}
exports.createError = createError;
