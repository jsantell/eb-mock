eb-mock [![Build Status](https://travis-ci.org/jsantell/eb-mock.png)](https://travis-ci.org/jsantell/eb-mock)
=======

Mock API for AWS ElasticBeanstalk.

An API mimicking [aws-sdk](https://www.npmjs.org/package/aws-sdk)'s ElasticBeanstalk wrapper.

Implements all [ElasticBeanstalk operations](http://docs.aws.amazon.com/elasticbeanstalk/latest/api/API_Operations.html), except the following methods, which are noops of consistent `param`, `callback` signatures:

* CheckDNSAvailability
* CreateConfigurationTemplate
* CreateStorageLocation
* DeleteApplicationVersion
* DeleteConfigurationTemplate
* DeleteEnvironmentConfiguration
* DescribeEvents
* DescribeConfigurationOptions
* DescribeConfigurationSettings
* DescribeEnvironmentResource
* RebuildEnvironment
* RetrieveEnvironmentInfo
* RequestEnvironmentInfo
* RestartAppServer
* UpdateConfigurationTemplate
* UpdateApplicationVersion
* ValidateConfigurationSettings

## Examples

```
var EB = require("eb-mock");
var fakeCreds = {};
var eb = new EB(fakeCreds);

eb.createApplication({
  ApplicationName: "my app"
}, function (err, data) {
  console.log(data);
});
```

## Testing

`npm test`

## TODO

* Add other methods as needed
* Perfect parity with AWS errors

## License

Copyright (c) 2014 Jordan Santell
