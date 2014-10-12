var createError = require("./utils").createError;
var findWhere = require("./utils").findWhere;
var SolutionStacks = require("./stacks").SolutionStacks;

var DEFINITIONS = {
  createApplication: {
    ApplicationName: { required: true, type: String },
    Description: { type: String }
  },
  updateApplication: {
    ApplicationName: { required: true, type: String },
    Description: { type: String }
  },
  deleteApplication: {
    ApplicationName: { required: true, type: String },
    Description: { type: String },
    TerminateEnvByForce: { type: Boolean }
  },
  describeApplications: {
    ApplicationNames: { type: [String] }
  },
  createEnvironment: {
    __constraints__: createEnvConstraint, 
    ApplicationName: { required: true, type: String },
    CNAMEPrefix: { type: String, min: 4, max: 63 },
    Description: { type: String, min: 0, max: 200},
    EnvironmentName: { required: true, min: 4, max: 23, regex: [/^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]$/, "Member must contain only letters, digits, and the dash character and may not start or end with a dash"] },
    OptionSettings: optionValidation,
    OptionsToRemove: optionValidation,
    SolutionStackName: solutionStackValidation,
    Tags: tagValidation,
    Tier: tierValidation,
    TemplateName: { type: String, min: 1, max: 100 },
    VersionLabel: { type: String, min: 1, max: 100 }
  },
  updateEnvironment: {
    __constraints__: updateEnvConstraint, 
    Description: { type: String, min: 0, max: 200},
    EnvironmentId: { type: String },
    EnvironmentName: { type: String },
    OptionSettings: optionValidation,
    OptionsToRemove: optionValidation,
    Tier: tierValidation,
    TemplateName: { type: String, min: 1, max: 100 },
    VersionLabel: { type: String, min: 1, max: 100 }
  },
  describeEnvironments: {
    ApplicationName: { type: String },
    EnvironmentIds: { type: [String] },
    EnvironmentNames: { type: [String] },
    VersionLabel: { type: String }
  },
  createApplicationVersion: {
    ApplicationName: { type: String, required: true },
    AutoCreateApplication: { type: Boolean },
    Description: { type: String },
    SourceBundle: sourceBundleValidation,
    VersionLabel: { type: String, required: true }
  },
  swapEnvironmentCNAMEs: {
    __constraints__: swapCNAMEConstraint,
    SourceEnvironmentName: { type: String },
    SourceEnvironmentId: { type: String },
    DestinationEnvironmentName: { type: String },
    DestinationEnvironmentId: { type: String }
  },
  terminateEnvironment: {
    __constraints__: terminateEnvConstraint,
    EnvironmentId: { type: String },
    EnvironmentName: { type: String },
    TerminateResources: { type: Boolean }
  }
};

/**
 * Takes a `definition` object and `params` and returns either an error or null,
 * depending on if the parameters are valid based off of the definition.
 *
 * @param {Object} definition
 * @param {Object} params
 * @param {Function} manualCheck
 * @return {Error|null}
 */

function validate (methodName, params, manualCheck) {
  var definition = DEFINITIONS[methodName];
  var properties = Object.keys(params);
  var required = Object.keys(definition).filter(function (def) { return definition[def].required; });

  if (definition.__constraints__) {
    var error = definition.__constraints__(params);
    if (error) {
      return error;
    }
  }

  for (var i = 0; i < properties.length; i++) {
    var prop = properties[i];
    var def = definition[prop];
    var value = params[prop];

    // Ensure that extra parameters aren't included
    if (!def) {
      return createError(new Error("Unexpected key \'" + prop + "\' found in params"), { code: "UnexpectedParameter" });
    }

    if (def.regex) {
      if (!def.regex[0].test(value)) {
        return createError(new Error("Value " + value + " at '" + prop + "' failed to satisfy constraint: " + def.regex[1]), { code: "InvalidParameterValue" });
      }
    }

    if (def.min && value.length < def.min) {
      return createError(new Error("1 validation error detected: Value " + value + " at '" + prop + "' failed to satisfy constraint: Member must have length less than or equal to " + def.min), {
        code: "ValidationError"
      });
    }

    if (def.max && value.length > def.max) {
      return createError(new Error("1 validation error detected: Value " + value + " at '" + prop + "' failed to satisfy constraint: Member must have length more than or equal to " + def.max), {
        code: "ValidationError"
      });
    }

    // If definition is a function, just run that
    if (typeof def === "function") {
      var error = def(value);
      if (error) return error;
    }

    // Ensure that parameter included is valid type
    if (def.type) {
      if (!checkType(value, def.type)) {
        return createError(new Error("Expected params." + prop + " to be a " + getType(def.type).toLowerCase()), { code: "InvalidParameterType" });
      }
    }
  }

  // Ensure that required parameters are defined, and also truthiness of required parameters,
  // so an empty string won't pass for a required string-field.
  for (var i = 0; i < required.length; i++) {
    if (!params[required[i]]) {
      return createError(new Error("Missing required key \'" + required[i] + "\' in params"), { code: "MissingRequiredParameter" });
    }
  }

  // Check a provided function for things like ensuring an Application is unique, etc.
  if (manualCheck) {
    return manualCheck() || null;
  }

  return null;
}
exports.validate = validate;

/**
 * Returns stringified typed name.
 *
 * @param {Object} type
 * @return {String}
 */

function getType (type) {
  if (Array.isArray(type)) {
    return "Array";
  }
  if (type.hasOwnProperty("name"))
    return type.name;
  else {
    var str = type.toString();
    var match = str.match(/^\s*function (.+)\(/);
    return match ? match[1] : str;
  }
}
exports.getType = getType;

/**
 * Ensures `value` is of type `type`.
 *
 * @param {Mixed} value
 * @param {Object} type
 * @return {Boolean}
 */

function checkType (value, type) {
  if (typeof type === "function") {
    type = getType(type);
  }
  
  if (type === "Array" || Array.isArray(type)) {
    if (!Object.prototype.toString.call(value) === "[object " + type + "]") {
      return false;
    }
    var elementType = type[0];
    // If no element type found, no subchecks needed
    if (!elementType) 
      return true;
    return value.every(function (el) { return checkType(el, elementType) });
  }
  
  return Object.prototype.toString.call(value) === "[object " + type + "]";
}
exports.checkType = checkType;

function createEnvConstraint (value) {
  var template = value.TemplateName;
  var solution = value.SolutionStackName;
  if (template && solution) {
    return createError(new Error("Cannot specify both Configuration Template Name and Solution Stack Name."), { code: "InvalidParameterCombination" });
    
  }
  if (!template && !solution) {
    return createError(new Error("You must specify either Configuration Template name or Solution Stack name."), { code: "MissingParameter" });

  }
}

function updateEnvConstraint (value) {
  if (!value.EnvironmentName && !value.EnvironmentId) {
    return createError(new Error("You must specify either EnvironmentName or EnvironmentId."), { code: "MissingRequiredParameter" });
  }

  if (value.VersionLabel && (value.OptionSettings || value.OptionsToRemove || value.TemplateName || value.Tier || value.Description)) {
    return createError(new Error("Cannot change both the release and configuration."), { code: "InvalidParameterCombination" });
  }
}

function optionValidation (value) {
  if (!value) return;
  if (!checkType(value, [Object])) {
    return createError(new Error("Expected OptionSettings to be a " + getType(def.type).toLowerCase()), { code: "InvalidParameterType" });
  }

  var error = null;
  value.forEach(function (options) {
    if (!options.Namespace || !options.OptionName) {
      error = createError(new Error(
        "Invalid parameter value (Namespace: '" + options.Namespace + "', OptionName: '" + options.OptionName + "'): Both the Namespace and the OptionName must be specified and non-empty."), { code: "InvalidParameterValue" });

    }
  });

  return error;
}

function tagValidation (value) {
  if (!value) return;
  if (!checkType(value, [Object])) {
    return createError(new Error("Expected Tags to be a " + getType(def.type).toLowerCase()), { code: "InvalidParameterType" });
  }

  var error = null;
  value.forEach(function (options) {
    if (!options.Value || !options.Key) {
      error = createError(new Error(
        "Invalid parameter value (Key: '" + options.Key + "', Value: '" + options.Value + "'): Both the Key and the Value must be specified and non-empty."), { code: "InvalidParameterValue" });
    }
  });

  return error;
}

function tierValidation (value) {
  if (!value) return;
  if (!checkType(value.Name, String)) {
    return createError(new Error("Expected Tier.Name to be a string"), { code: "InvalidParameterType" });
  }
  if (!checkType(value.Type, String)) {
    return createError(new Error("Expected Tier.Type to be a string"), { code: "InvalidParameterType" });
  }
  if (!checkType(value.Version, String)) {
    return createError(new Error("Expected Tier.Version to be a string"), { code: "InvalidParameterType" });
  }
}

function solutionStackValidation (value) {
  if (!~SolutionStacks.indexOf(value)) {
    return createError(new Error("No application version exists to deploy for Application named <TODO>"), { code: "InvalidParameterValue" }); 
  }
}

function sourceBundleValidation (value) {
  if (!value) return;
  if (!checkType(value.S3Bucket, String)) {
    return createError(new Error("Expected SourceBundle.S3Bucket to be a string"), { code: "InvalidParameterType" });
  }
  if (!checkType(value.S3Key, String)) {
    return createError(new Error("Expected SourceBundle.S3Key to be a string"), { code: "InvalidParameterType" });
  }
}

function swapCNAMEConstraint (value) {
  // Can use either names or IDs, or both, but must come in pairs.
  if (!!(value.SourceEnvironmentId) !== !!(value.DestinationEnvironmentId)) {
    return createError(new Error("Both EnvironmentIds must be given"), { code: "InvalidParameterValue" });
  }
  if (!!(value.SourceEnvironmentName) !== !!(value.DestinationEnvironmentName)) {
    return createError(new Error("Both EnvironmentNames must be given"), { code: "InvalidParameterValue" });
  }
}

function terminateEnvConstraint (value) {
  if (!value.EnvironmentId && !value.EnvironmentName) {
    return createError(new Error("Requires either EnvironmentName or EnvironmentId"), { code: "MissingRequiredParameter" });
  }
}
