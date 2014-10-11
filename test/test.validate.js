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
});
