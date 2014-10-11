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
    if (utils.findWhere(eb._applications, { ApplicationName: params.ApplicationName })) {
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
    if (!utils.findWhere(eb._applications, { ApplicationName: params.ApplicationName })) {
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
  var error = validate("createEnvironment", params, function () {
    
  });

};

ElasticBeanstalk.prototype.describeEnvironments = function describeEnvironments (params) {
  return when.resolve({ Environments: this._environments });
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

ElasticBeanstalk.prototype.createApplicationVersion = function createApplicationVersion (params) {
  isNonEmptyString(params.ApplicationName);
  isNonEmptyString(params.VersionLabel);

  if (!params.SourceBundle) {
    params.SourceBundle = {};
  }

  var version = {
    ApplicationName: params.ApplicationName,
    Description: params.Description,
    VersionLabel: params.VersionLabel,
    SourceBundle: { S3Bucket: params.SourceBundle.S3Bucket, S3Key: params.SourceBundle.S3Key },
    DateCreated: new Date(),
    DateUpdated: new Date()
  };

  this._versions.push(version);
  var app = utils.findWhere(this._applications, { ApplicationName: params.ApplicationName });
  app.Versions.push(version.VersionLabel);

  return when.resolve(response({ ApplicationVersion: version }));
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
