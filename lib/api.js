var validate = require("./validate").validate;
var utils = require("./utils");
var createError = require("./utils").createError;
var stacks = require("./stacks");
var respond = utils.respond;

function ElasticBeanstalk (config) {
  this._applications = [];
  this._environments = [];
  this._versions = [];
  this._s3 = {};
}
module.exports = ElasticBeanstalk;

ElasticBeanstalk.prototype.createApplication = function createApplication (params, fn) {
  var eb = this;
  var error = validate("createApplication", params, function () {
    if (utils.doesApplicationExist(eb, params.ApplicationName)) {
      return createError(new Error("Application " + params.ApplicationName + " already exists."), { code: "InvalidParameterValue" });
    }
  });

  if (error) {
    return respond(fn, error, null);
  }

  var app = {
    ApplicationName: (params || {}).ApplicationName,
    Description: (params || {}).Description,
    DateCreated: new Date(),
    DateUpdated: new Date(),
    Versions: [],
    ConfigurationTemplates: []
  };

  this._applications.push(app);

  respond(fn, null, { Application: app });
};

ElasticBeanstalk.prototype.updateApplication = function updateApplication (params, fn) {
  var eb = this;
  var error = validate("createApplication", params, function () {
    if (!utils.doesApplicationExist(eb, params.ApplicationName)) {
      return createError(new Error("No Application named \'" + params.ApplicationName + "\' found."), { code: "InvalidParameterValue" });
    }
  });

  if (error) {
    return respond(fn, error, null);
  }

  var apps = this._applications;
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].ApplicationName === params.ApplicationName) {
      apps[i].Description = params.Description;
      apps[i].DateUpdated = new Date();
      return respond(fn, null, { Application: apps[i] });
    }
  }
};

ElasticBeanstalk.prototype.deleteApplication = function deleteApplication (params, fn) {
  var error = validate("deleteApplication", params);

  if (error) {
    return respond(fn, error, null);
  }

  var apps = this._applications;
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].ApplicationName === params.ApplicationName) {
      apps.splice(i, 1);
      return respond(fn, null, {});
    }
  }
  respond(fn, null, {});
};

ElasticBeanstalk.prototype.describeApplications = function describeApplications (params, fn) {
  params = params || {};
  var error = validate("describeApplications", params);

  if (error) {
    return respond(fn, error, null);
  }

  var apps = params.ApplicationNames ? this._applications.filter(function (app) {
    return !!~params.ApplicationNames.indexOf(app.ApplicationName);
  }) : this._applications;

  respond(fn, null, { Applications: apps });
};

ElasticBeanstalk.prototype.createEnvironment = function createEnvironment (params, fn) {
  var eb = this;
  var error = validate("createEnvironment", params, function () {
    // Check application exists
    if (!utils.doesApplicationExist(eb, params.ApplicationName)) {
      return createError(new Error("No Application " + params.ApplicationName + " found."), { code: "InvalidParameterValue" });
    }

    // Check version exists
    if (params.VersionLabel && !utils.doesVersionExist(eb, params.ApplicationName, params.VersionLabel)) {
      return createError(new Error("No VersionLabel for " + params.VersionLabel + " with Application " + params.ApplicationName + "."), { code: "InvalidParameterValue" });
    }
  });

  if (error) {
    return respond(fn, error, null);
  }

  var env = utils.copy(params);
  env.EnvironmentId = utils.createEnvironmentId();
  env.DateCreated = new Date();
  env.DateUpdated = new Date();
  env.Status = "Launching";
  env.Health = "Grey";
  env.Tier = env.Tier || { Name: "WebSever", Type: "Standard", Version: "1.0" };

  this._environments.push(env);
  respond(fn, null, env);
};

/**
 * Does not support options:
 * - `IncludeDeleted`
 * - `IncludedDeletedBackTo`
 */
ElasticBeanstalk.prototype.describeEnvironments = function describeEnvironments (params, fn) {
  var error = validate("describeEnvironments", params);

  if (error) {
    return respond(fn, error, null);
  }
  
  var envs = this._environments.filter(function (env) {
    var valid = true;
    if (params.EnvironmentIds) {
      if (!~params.EnvironmentIds.indexOf(env.EnvironmentId)) valid = false;
    }
    if (params.EnvironmentNames) {
      if (!~params.EnvironmentNames.indexOf(env.EnvironmentName)) valid = false;
    }
    if (params.VersionLabel && env.VersionLabel !== params.VersionLabel) {
      valid = false; 
    }
    if (params.ApplicationName && env.ApplicationName !== params.ApplicationName) {
      valid = false; 
    }
    return valid;
  });

  respond(fn, null, { Environments: envs });
};

/**
 * Updates an Environment on AWS.
 *
 * @param {Object} params
 * - {String} EnvironmentId
 * - {String} EnvironmentName
 * - {String} Description
 * - {[OptionObjects]} OptionSettings
 *   - {String} Namespace
 *   - {String} OptionName
 *   - {String} Value
 * - {[OptionObjects]} OptionsToRemove
 *   - {String} Namespace
 *   - {String} OptionName
 * - {String} SolutionStackName
 * - {[TagObject]} Tags
 *   - {String} Key
 *   - {String} Value
 * - {Object} Tier
 *   - {String} Name
 * - {String} TemplateName
 * - {String} VersionLabel
 */

ElasticBeanstalk.prototype.updateEnvironment = function updateEnvironment (params) {
  return this.eb.updateEnvironment(params || {});
};

/**
 * Swaps two environments' CNAMES by name
 *
 * @param {Object}
 * - {String} DestinationEnvironmentName
 * - {String} SourceEnvironmentName
 */

ElasticBeanstalk.prototype.swapEnvironmentCNAMEs = function swapEnvironmentCNAMEs (params) {
  return this.eb.swapEnvironmentCNAMEs(params || {});
};

/**
 * Does not check for the existence of S3 bucket items.
 */

ElasticBeanstalk.prototype.createApplicationVersion = function createApplicationVersion (params) {
  var error = validate("createApplicationVersion", params);

  if (error) {
    return respond(fn, error, null);
  }

  var version = utils.copy(params);

  if (!version.SourceBundle) {
    version.SourceBundle = {};
  }

  version.DateCreated = new Date(),
  version.DateUpdated = new Date()

  this._versions.push(version);
  var app = utils.findWhere(this._applications, { ApplicationName: params.ApplicationName });
  app.Versions.push(version.VersionLabel);

  respond(fn, null, version);
};

/**
 * S3 operations on the EB instance to interface with `addVersion`
 */

ElasticBeanstalk.prototype.createBucket = function createBucket (params) {
  this._s3[params.Bucket] = {};
  return when.resolve(response({}));
};

ElasticBeanstalk.prototype.putObject = function putObject (params) {
  assert(this._s3[params.Bucket]);
  var bucket = this._s3[params.Bucket];
  bucket[params.Key] = params.Body;
  return when.resolve(response());
};
