var expect = require("chai").expect;
var EB = require("../");
var validate = require("../lib/validate");

describe("Validate", function () {
  describe("getType", function () {
    it("identifies string", function () {
      expect(validate.getType(String)).to.be.equal("String");
    });
    it("identifies number", function () {
      expect(validate.getType(Number)).to.be.equal("Number");
    });
    it("identifies object", function () {
      expect(validate.getType(Object)).to.be.equal("Object");
    });
    it("identifies array", function () {
      expect(validate.getType(Array)).to.be.equal("Array");
    });
    it("identifies date", function () {
      expect(validate.getType(Date)).to.be.equal("Date");
    });
    it("identifies specific Array primitives", function () {
      expect(validate.getType([String])).to.be.equal("Array");
    });
  });

  describe("checkType", function () {
    var def = [
      ["hello", String],
      [500, Number],
      [{}, Object],
      [new Date(), Date],
      [[], Array]
    ];

    Object.keys(def).forEach(function (prop) {
      var duple = def[prop];
      it("validates " + duple[1] + " primitives", function () {
        expect(validate.checkType(duple[0], duple[1])).to.be.equal(true);
      });

      // Skip array of arrays for now
      if (duple[1] !== Array) {
        it("validates elements of an array of type [" + duple[1] + "]", function () {
          var validArray = [duple[0], duple[0], duple[0]];
          expect(validate.checkType(validArray, [duple[1]])).to.be.equal(true);
        });

        it("invalidates invalid elements of an array of type [" + duple[1] + "]", function () {
          var invalidArray = duple[1] === Number ? ["hey", "ya"] : [100, 500];
          expect(validate.checkType(invalidArray, [duple[1]])).to.be.equal(false);
        });
      }
    });
  });

  describe("environment validation", function () {
    it("passes for valid environments", function () {
      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "myenv",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3"
      })).to.be.equal(null);

      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "myenv",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3",
        OptionSettings: [{ Namespace: "aws:yeah", OptionName: "somevalue", Value: "woo" }],
        OptionsToRemove: [{ Namespace: "aws:yeah", OptionName: "somevalue" }],
        Tags: [{ Key: "mykey", Value: "myvalue" }],
        Tier: { Name: "yeah", Type: "duno", Version: "whatever" }
      })).to.be.equal(null);
    });
    it("can't have both template and stacksolution", function () {
      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "myenv",
        TemplateName: "my template",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3"
      }).code).to.be.equal("InvalidParameterCombination");
    });
    it("needs atleast template or stack solution", function () {
      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "myenv",
      }).code).to.be.equal("MissingParameter");
    });
    it("needs a valid Solution Stack if provided", function () {
      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "myenv",
        SolutionStackName: "whooohoo"
      }).code).to.be.equal("InvalidParameterValue");
    });
    it("Tier constraint", function () {
      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "myenv",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3",
        Tier: { Name: "yeah" },
      }).code).to.be.equal("InvalidParameterType");
    });
    it("Environment is constrained by alphanumeric/dashes, starting/ending with alphanumeric", function () {
      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "-myenv",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3"
      }).code).to.be.equal("InvalidParameterValue");
      
      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "myenv-",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3"
      }).code).to.be.equal("InvalidParameterValue");

      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "mye_nv",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3"
      }).code).to.be.equal("InvalidParameterValue");
      
      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "mye-nv",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3"
      })).to.be.equal(null);
    });
    it("OptionSettings constraint", function () {
      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "myenv",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3",
        OptionSettings: [{ NotValid: "yeah" }]
      }).code).to.be.equal("InvalidParameterValue");
    });
    it("OptionstoRemove constraint", function () {
      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "myenv",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3",
        OptionsToRemove: [{ NotValid: "yeah" }]
      }).code).to.be.equal("InvalidParameterValue");
    });
    it("Tag constraint", function () {
      expect(validate.validate("createEnvironment", {
        ApplicationName: "myapp",
        EnvironmentName: "myenv",
        SolutionStackName: "32bit Amazon Linux running PHP 5.3",
        Tags: [{ NotValid: "yeah" }]
      }).code).to.be.equal("InvalidParameterValue");
    });

    it("fails when attempting to update both version and configuration", function () {
      expect(validate.validate("updateEnvironment", {
        EnvironmentName: "myenv",
        VersionLabel: "1.0.0",
        Tier: { Name: "yeah", Type: "duno", Version: "whatever" }
      }).code).to.be.equal("InvalidParameterCombination");
    });
  });

  describe("CNAME swap validation", function () {
    it("passes for two EnvironmentIds", function () {
      expect(validate.validate("swapEnvironmentCNAMEs", {
        SourceEnvironmentId: "super",
        DestinationEnvironmentId: "radical"
      })).to.be.equal(null);
    });
    it("passes for two EnvironmentNames", function () {
      expect(validate.validate("swapEnvironmentCNAMEs", {
        SourceEnvironmentName: "super",
        DestinationEnvironmentName: "radical"
      })).to.be.equal(null);
    });
    it("passes for both EnvironmentNames and EnvironmentIds", function () {
      expect(validate.validate("swapEnvironmentCNAMEs", {
        SourceEnvironmentName: "super",
        DestinationEnvironmentName: "radical",
        SourceEnvironmentId: "super",
        DestinationEnvironmentId: "radical"
      })).to.be.equal(null);
    });
    it("fails when missing an extra id", function () {
      expect(validate.validate("swapEnvironmentCNAMEs", {
        SourceEnvironmentName: "super",
        DestinationEnvironmentName: "radical",
        DestinationEnvironmentId: "radical"
      }).code).to.be.equal("InvalidParameterValue");
    });
    it("fails when missing any pair", function () {
      expect(validate.validate("swapEnvironmentCNAMEs", {
        SourceEnvironmentName: "super",
      }).code).to.be.equal("InvalidParameterValue");
    });
  });
});
