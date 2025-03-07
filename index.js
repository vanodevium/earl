/**
 * @typedef {Object} QueryObject
 * @property {"query"|"mutation"|undefined} _type
 * @property {string=} _name
 * @property {string=} _alias
 * @property {Array<string|QueryObject>=} _fields
 * @property {{string, string}=} _variables
 * @property {Object<string, string|object>|undefined} _arguments
 */

/**
 * @param {QueryObject} queryObj
 * @param {Object=} variables
 * @returns {{query: String, variables: {}}}
 */
function createQuery(queryObj, variables = {}) {
  if (!queryObj._type && !queryObj._fields) {
    throw new Error("root object must have _type or _fields property");
  }

  if (!queryObj._type) {
    queryObj._type = "query";
  }

  const query = compile(queryObj);

  return {
    query,
    variables,
  };
}

/**
 * @param {QueryObject} queryObj
 * @param {Object=} options
 * @returns {String}
 */
function query(queryObj, options = {}) {
  queryObj._type = "query";
  return compile(queryObj, options);
}

/**
 * @param {QueryObject} mutationObj
 * @param {Object=} options
 * @returns {String}
 */
function mutation(mutationObj, options = {}) {
  mutationObj._type = "mutation";
  return compile(mutationObj, options);
}

/**
 * @param {QueryObject} obj
 * @param {Object=} options
 * @returns {String}
 */
function compile(obj, options = {}) {
  const { indentSize = 2, initialIndent = 0 } = options;
  return _parseQueryObject(obj, initialIndent, indentSize);
}

function _isArray(value) {
  return Array.isArray(value);
}

function _isObject(value) {
  return value !== null && typeof value === "object";
}

function _isString(value) {
  return typeof value === "string";
}

function _parseQueryObject(obj, initialIndent = 0, initialIndentSize = 2) {
  const indentSize = initialIndentSize;
  let indent = initialIndent;
  let result = "";

  if (obj._type) {
    result += obj._type;

    if (obj._name) {
      result += ` ${obj._name}`;
    }

    if (_isObject(obj._variables)) {
      const variables = Object.entries(obj._variables)
        .map(([name, type]) => {
          if (_isString(type)) {
            return `$${name}: ${type}`;
          }

          return "";
        })
        .filter(Boolean)
        .join(", ");

      result += `(${variables})`;
    }

    result += " {\n";
    indent += indentSize;
  }

  if (obj._fields) {
    if (_isArray(obj._fields)) {
      result += _parseFieldsArray(obj._fields, indent, indentSize);
    } else if (_isObject(obj._fields)) {
      result += _parseFieldsObject(obj._fields, indent, indentSize);
    }
  }

  if (obj._type) {
    result += `${" ".repeat(indent - indentSize)}}`;
  }

  return result;
}

function _parseFieldsArray(fields, indent, indentSize) {
  let result = "";

  for (const field of fields) {
    if (_isString(field)) {
      result += `${" ".repeat(indent)}${field}\n`;
    } else if (_isObject(field)) {
      const fieldName = Object.keys(field)[0];
      const fieldValue = field[fieldName];

      if (_isObject(fieldValue)) {
        result += _parseObjectField(fieldName, fieldValue, indent, indentSize);
      } else {
        result += `${" ".repeat(indent)}${fieldName}\n`;
      }
    }
  }

  return result;
}

function _parseFieldsObject(fields, indent, indentSize) {
  let result = "";

  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    if (fieldName.startsWith("_")) continue;

    if (_isObject(fieldValue)) {
      result += _parseObjectField(fieldName, fieldValue, indent, indentSize);
    }
  }

  return result;
}

function _parseObjectField(fieldName, fieldValue, indent, indentSize) {
  let result = "";
  const fieldArgs = fieldValue._arguments
    ? `(${_formatArguments(fieldValue._arguments)})`
    : "";
  const block = _parseArrayOrObject(
    fieldValue,
    indent + indentSize,
    indentSize,
  );
  const field = fieldValue._alias
    ? `${fieldValue._alias}: ${fieldName}`
    : fieldName;
  result += `${" ".repeat(indent)}${field}${fieldArgs} ${block ? "{" : ""}\n`;
  result += block;
  result += `${" ".repeat(indent)}${block ? "}" : ""}\n`;

  return result;
}

function _parseArrayOrObject(value, indent, indentSize) {
  return _isArray(value)
    ? _parseFieldsArray(value, indent, indentSize)
    : _parseQueryObject(value, indent, indentSize);
}

function _formatArguments(args) {
  return Object.entries(args)
    .map(([k, v]) => `${k}: ${_formatArgumentValue(v)}`)
    .join(", ");
}

function _formatArgumentValue(value) {
  if (value === null) {
    return "null";
  }

  if (_isString(value)) {
    if (value.startsWith("$")) {
      return value;
    }
    return `"${value}"`;
  }

  if (typeof value === "object") {
    if (_isArray(value)) {
      return `[${value.map(_formatArgumentValue).join(", ")}]`;
    }

    return `{${Object.entries(value)
      .map(([k, v]) => `${k}: ${_formatArgumentValue(v)}`)
      .join(", ")}}`;
  }

  return String(value);
}

export { createQuery, query, mutation, compile };
