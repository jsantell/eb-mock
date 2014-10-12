var expect = require("chai").expect;
var EB = require("../");

describe("Mock API", function () {
  describe("general", function () {
    it("modifying responses does not modify internal state", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "my-app" }, function (err, data) {
        data.myParam = "hello";
        data.DateCreated = "yeah";
        
        eb.describeApplications({}, function (err, data) {
          var app = data.Applications[0];
          expect(app.myParam).to.be.equal(undefined);
          expect(app.DateCreated).to.be.a("date");
          done();
        });
      });
    });
    it("stubs out unsupported methods", function (done) {
      var eb = new EB();
      var count = EB.UNSUPPORTED.length;

      function tick() {
        if (!--count) {
          done();
        }
      }
      EB.UNSUPPORTED.forEach(function (method) {
        eb[method]({}, function (err, data) {
          expect(err).to.be.equal(null);
          expect(data.ResponseMetadata.RequestId).to.be.a("string");
          tick();
        });
      });
    });

    it("successful requests have metadata", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "yeah" }, function (err, data) {
        expect(data.ResponseMetadata.RequestId).to.be.a("string");
        done();
      });
    });
    it("errors have all expected properties", function (done) {
      var eb = new EB();
      eb.createApplication({}, function (err, data) {
        expect(err.toString()).to.be.equal("MissingRequiredParameter: Missing required key 'ApplicationName' in params");
        expect(err.code).to.be.equal("MissingRequiredParameter");
        expect(err.message).to.be.equal("Missing required key 'ApplicationName' in params");
        expect(err.time).to.be.a("date");
        done();
      });
    });
  });

  describe("createApplication", function () {
    it("creates an application", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "yeah" }, function (err, data) {
        var app = data.Application;
        expect(err).to.be.equal(null);
        expect(app.ApplicationName).to.be.equal("yeah");
        expect(app.Description).to.be.equal(undefined);
        expect(app.Versions).to.be.an("array");
        expect(app.ConfigurationTemplates).to.be.an("array");
        expect(app.DateCreated).to.be.a("date");
        expect(app.DateUpdated).to.be.a("date");
        done();
      });
    });

    it("errors if ApplicationName not defined", function (done) {
      var eb = new EB();
      eb.createApplication({ Description: "yeah" }, function (err, app) {
        expect(app).to.be.equal(null);
        expect(err.code).to.be.equal("MissingRequiredParameter");
        done();
      });
    });

    it("errors if ApplicationName already exists", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "yeah" }, function (err, app) {
        eb.createApplication({ ApplicationName: "yeah" }, function (err, app) {
          expect(app).to.be.equal(null);
          expect(err.code).to.be.equal("InvalidParameterValue");
          done();
        });
      });
    });
  });

  describe("updateApplication", function () {
    it("updates an existing application", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "yeah" }, function (err, data) {
        eb.updateApplication({ ApplicationName: "yeah", Description: "wahoo" }, function (err, app) {
          eb.describeApplications({}, function (err, data) {
            expect(err).to.be.equal(null);
            expect(data.Applications[0].ApplicationName).to.be.equal("yeah");
            expect(data.Applications[0].Description).to.be.equal("wahoo");
            done();
          });
        });
      });
    });
    it("fails if application does not exist", function (done) {
      var eb = new EB();
      eb.updateApplication({ ApplicationName: "yeah" }, function (err, data) {
        expect(data).to.be.equal(null);
        expect(err.code).to.be.equal("InvalidParameterValue");
        done();
      });
    });
  });

  describe("deleteApplication", function () {
    it("removes the application", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "yeah" }, function (err, data) {
        eb.deleteApplication({ ApplicationName: "yeah" }, function (err, app) {
          eb.describeApplications({}, function (err, data) {
            expect(err).to.be.equal(null);
            expect(data.Applications.length).to.be.equal(0);
            done();
          });
        });
      });
    });
    it("fails silently if application does not exist", function (done) {
      var eb = new EB();
      eb.deleteApplication({ ApplicationName: "yeah" }, function (err, data) {
        expect(err).to.be.equal(null);
        expect(data).to.be.ok;
        done();
      });
    });
  });

  describe("describeApplications", function () {
    it("describes all applications", function (done) {
      var eb = new EB();
      eb.createApplication({ApplicationName: "one" }, function (err, data) {
        eb.createApplication({ApplicationName: "two" }, function () {
          eb.describeApplications({}, function (err, data) {
            expect(data.Applications[0].ApplicationName).to.be.equal("one");
            expect(data.Applications[1].ApplicationName).to.be.equal("two");
            done();
          });
        })
      });
    });
    it("describes only applications matching ApplicationNames array, n === 1", function (done) {
      var eb = new EB();
      eb.createApplication({ApplicationName: "one" }, function (err, data) {
        eb.createApplication({ApplicationName: "two" }, function () {
          eb.describeApplications({ ApplicationNames: ["one"]}, function (err, data) {
            expect(data.Applications[0].ApplicationName).to.be.equal("one");
            expect(data.Applications.length).to.be.equal(1);
            done();
          });
        });
      });
    });
    it("describes only applications matching ApplicationNames array, n > 1", function (done) {
      var eb = new EB();
      eb.createApplication({ApplicationName: "one" }, function (err, data) {
        eb.createApplication({ApplicationName: "two" }, function () {
          eb.describeApplications({ ApplicationNames: ["one", "two"]}, function (err, data) {
            expect(data.Applications[0].ApplicationName).to.be.equal("one");
            expect(data.Applications[1].ApplicationName).to.be.equal("two");
            expect(data.Applications.length).to.be.equal(2);
            done();
          });
        });
      });
    });
    it("fails if ApplicationNames is not an array of strings", function (done) {
      var eb = new EB();
      eb.describeApplications({ApplicationNames: [1]}, function (err, data) {
        expect(err.code).to.be.equal("InvalidParameterType");
        done();
      });
    });
  });

  describe("createEnvironment", function () {
    it("creates an environment if valid", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "myapp" }, function (err, data) {
        eb.createEnvironment({
          ApplicationName: "myapp",
          EnvironmentName: "myenv",
          SolutionStackName: "32bit Amazon Linux running PHP 5.3"
        }, function (err, data) {
          expect(data.EnvironmentName).to.be.equal("myenv");
          done();
        });
      });
    });
    it("fails if application does not exist", function (done) {
      var eb = new EB();
      eb.createEnvironment({
        ApplicationName: "myapp",
        EnvironmentName: "myenv",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3"
      }, function (err, data) {
        expect(err.code).to.be.equal("InvalidParameterValue");
        done();
      });
    });
    it("fails if application version does not exist if defined", function (done) {
      var eb = new EB();
      eb.createEnvironment({
        ApplicationName: "myapp",
        EnvironmentName: "myenv",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3",
        VersionLabel: "nope"
      }, function (err, data) {
        expect(err.code).to.be.equal("InvalidParameterValue");
        done();
      });
    });
    it("generates correct CNAME when prefix provided", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "myapp" }, function (err, data) {
        eb.createEnvironment({
          ApplicationName: "myapp",
          EnvironmentName: "myenv",
          SolutionStackName: "32bit Amazon Linux running PHP 5.3",
          CNAMEPrefix: "water"
        }, function (err, data) {
          expect(data.CNAME).to.be.equal("http://water.elasticbeanstalk.com");
          expect(data.CNAMEPrefix).to.be.equal(undefined);
          done();
        });
      });
    });
    it("generates correct CNAME when prefix not provided", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "myapp" }, function (err, data) {
        eb.createEnvironment({
          ApplicationName: "myapp",
          EnvironmentName: "myenv",
          SolutionStackName: "32bit Amazon Linux running PHP 5.3"
        }, function (err, data) {
          expect(/^http:\/\/myenv-[a-z]{10}\.elasticbeanstalk\.com/.test(data.CNAME)).to.be.equal(true);
          expect(data.CNAMEPrefix).to.be.equal(undefined);
          done();
        });
      });
    });
  });

  describe("describeEnvironments", function () {
    it("correctly returns all environments if no constraints", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "myapp1" }, function (err, data) {
        eb.createApplication({ ApplicationName: "myapp2" }, function (err, data) {
          eb.createEnvironment({
            ApplicationName: "myapp1",
            EnvironmentName: "myenv1",
            SolutionStackName: "32bit Amazon Linux running PHP 5.3"
          }, tick);
          eb.createEnvironment({
            ApplicationName: "myapp2",
            EnvironmentName: "myenv1",
            SolutionStackName: "32bit Amazon Linux running PHP 5.3"
          }, tick);
          eb.createEnvironment({
            ApplicationName: "myapp1",
            EnvironmentName: "myenv2",
            SolutionStackName: "32bit Amazon Linux running PHP 5.3"
          }, tick);
        });
      });
      var count = 3;
      function tick () {
        if (!--count) {
          eb.describeEnvironments({}, function (err, data) {
            expect(data.Environments.length).to.be.equal(3);
            done();
          });
        }
      }
    });

    it("correctly filters by params", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "myapp1" }, function (err, data) {
        eb.createApplication({ ApplicationName: "myapp2" }, function (err, data) {
          eb.createEnvironment({
            ApplicationName: "myapp1",
            EnvironmentName: "myenv1",
            SolutionStackName: "32bit Amazon Linux running PHP 5.3"
          }, tick);
          eb.createEnvironment({
            ApplicationName: "myapp2",
            EnvironmentName: "myenv1",
            SolutionStackName: "32bit Amazon Linux running PHP 5.3"
          }, tick);
          eb.createEnvironment({
            ApplicationName: "myapp1",
            EnvironmentName: "myenv2",
            SolutionStackName: "32bit Amazon Linux running PHP 5.3"
          }, tick);
        });
      });
      var count = 3;
      function tick () {
        if (!--count) {
          eb.describeEnvironments({ EnvironmentNames: ["myenv1", "myenv2"]}, function (err, data) {
            expect(data.Environments.length).to.be.equal(3);
            tick2();
          });
          eb.describeEnvironments({ EnvironmentNames: ["nope"]}, function (err, data) {
            expect(data.Environments.length).to.be.equal(0);
            tick2();
          });
          eb.describeEnvironments({ ApplicationName: "myapp1" }, function (err, data) {
            expect(data.Environments.length).to.be.equal(2);
            tick2();
          });
          eb.describeEnvironments({ EnvironmentIds: ["yeah"], EnvironmentNames: ["myenv1"]}, function (err, data) {
            expect(data.Environments.length).to.be.equal(0);
            tick2();
          });
        }
      }
      var count2 = 4;
      function tick2 () {
        if (!--count2) {
          done();
        }
      }
    });
  });

  describe("updateEnvironment", function () {
    it("updates environment", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "myapp1" }, function (err, data) {
        eb.createEnvironment({ ApplicationName: "myapp1", EnvironmentName: "myenv", SolutionStackName: "32bit Amazon Linux running PHP 5.3" }, function (err, data) {
          eb.updateEnvironment({ EnvironmentId: data.EnvironmentId, Description: "Whooo yeah" }, function (err, data) {
            expect(data.Description).to.be.equal("Whooo yeah");
            done();
          });

        });
      });
    });

    it("fails when no environment found", function (done) {
      var eb = new EB();
      eb.updateEnvironment({ EnvironmentId: "e-abcdefghij", Description: "Whooo yeah" }, function (err, data) {
        expect(err.code).to.be.equal("InvalidParameterValue");
        done();
      });
    });
  });
  
  describe("swapEnvironmentCNAMEs", function () {
    it("switches CNAMEs", function (done) {
      var eb = new EB();
      eb.createApplication({ ApplicationName: "myapp1" }, function (err, data) {
        eb.createEnvironment({
          ApplicationName: "myapp1", EnvironmentName: "app1", SolutionStackName: "32bit Amazon Linux running PHP 5.3", CNAMEPrefix: "app1cname"
        }, function (err, data) {
          eb.createEnvironment({
            ApplicationName: "myapp1", EnvironmentName: "app2", SolutionStackName: "32bit Amazon Linux running PHP 5.3", CNAMEPrefix: "app2cname"
          }, ready);
        });
      });

      function ready () {
        eb.swapEnvironmentCNAMEs({ SourceEnvironmentName: "app1", DestinationEnvironmentName: "app2" }, function (err, data) {
          eb.describeEnvironments({}, function (err, data) {
            var app1 = data.Environments[0];
            var app2 = data.Environments[1];

            expect(app1.EnvironmentName).to.be.equal("app1");
            expect(app1.CNAME).to.be.equal("http://app2cname.elasticbeanstalk.com");
            expect(app2.EnvironmentName).to.be.equal("app2");
            expect(app2.CNAME).to.be.equal("http://app1cname.elasticbeanstalk.com");
            done();
          });
        });
      }
    });
  });
  describe("terminateEnvironment", function () {
    it("removes environment and sets status after delay", function (done) {
      var eb = new EB();
      eb["ENV_TERMINATE_DURATION"] = 50;
      eb.createApplication({ ApplicationName: "myapp1" }, function (err, data) {
        eb.createEnvironment({ ApplicationName: "myapp1", EnvironmentName: "myenv", SolutionStackName: "32bit Amazon Linux running PHP 5.3" }, function (err, data) {
          eb.terminateEnvironment({ EnvironmentName: "myenv" }, function (err, data) {
            expect(err).to.be.equal(null);
            expect(data.Status).to.be.equal("Terminating");
            expect(data.Health).to.be.equal("Grey");
            setTimeout(function () {
              eb.describeEnvironments({}, function (err, data) {
                expect(err).to.be.equal(null);
                console.log(data.Environments);
                expect(data.Environments[0].Status).to.be.equal("Terminated");
                expect(data.Environments[0].Health).to.be.equal("Grey");
                done();
              });
            }, 200);
          });
        });
      });
    });
  });
});
