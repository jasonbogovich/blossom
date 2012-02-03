/*globals global require __dirname BT XM process */

require('blossom/buildtools'); // adds the BT namespace as a global

var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    assert = require('assert'),
    vows = require('vows');

var datastore = require('blossom/datastore');

// var jsFiles = foundation.get('orderedJavaScriptFiles').map(function(file) {
//   return file.get('sourcePath');
// });

// Don't include the app itself.

global.SC = global.SproutCore; // Already loaded by the buildtools
// global.SproutCore = SC;
// global.BLOSSOM = true;
// global.SPROUTCORE = false;
// global.FAST_LAYOUT_FUNCTION = false;

// Load the code we want to test.
// console.log(jsFiles);
// jsFiles.forEach(function(path) { require(path); });

// Simulate becoming "ready"
SC.didBecomeReady();

// Start the proxy server.
// var http = require('http'),
//     PROXY_LISTEN = 4020,
//     PROXY_HOST = '127.0.0.1', PROXY_PORT = 9000,
//     PROXY_PREFIX_FROM = '/datasource/', PROXY_PREFIX_TO = '/';
// 
// var server = http.createServer(function(request, response) {
//   var body = '';
//   
//   request.addListener('data', function(chunk) {
//     body += chunk;
//   });
// 
//   request.addListener('end', function() {
//     var proxyClient, proxyRequest,
//         url = request.url;
// 
//     if (PROXY_PREFIX_FROM.length > 0 && url.indexOf(PROXY_PREFIX_FROM) < 0) {
//       console.error("Don't know how to proxy: " + url);
//       response.writeHead(404);
//       response.end();
//       return; // don't proxy this
//     } else {
//       url = url.replace(PROXY_PREFIX_FROM, PROXY_PREFIX_TO);
//     }
// 
//     // console.log("PROXYING http://localhost:"+PROXY_LISTEN + request.url + " TO http://" + PROXY_HOST + ":" + PROXY_PORT + url);
//     proxyClient = http.createClient(PROXY_PORT, PROXY_HOST);
// 
//     proxyClient.addListener('error', function(err) {
//       console.error('ERROR: "' + err.message + '" for proxy request on ' + PROXY_HOST + ':' + PROXY_PORT);
//       response.writeHead(404);
//       response.end();
//     });
// 
//     request.headers.host = PROXY_HOST;
//     request.headers['content-length'] = body.length;
//     request.headers['X-Forwarded-Host'] = request.headers.host + ':' + PROXY_LISTEN;
//     if (PROXY_PORT != 80) request.headers.host += ':' + PROXY_PORT;
//     
//     proxyRequest = proxyClient.request(request.method, url, request.headers);
// 
//     if (body.length > 0) { proxyRequest.write(body); }
// 
//     proxyRequest.addListener('response', function(proxyResponse) {
//       response.writeHead(proxyResponse.statusCode, proxyResponse.headers);
//       proxyResponse.addListener('data', function(chunk) {
//         response.write(chunk, 'binary');
//       });
//       proxyResponse.addListener('end', function() {
//         response.end();
//       });
//     });
// 
//     proxyRequest.end();
//   });
// 
// }).listen(PROXY_LISTEN);
// console.log("PROXY: http://"+PROXY_HOST+":"+PROXY_LISTEN + PROXY_PREFIX_FROM + '*' + " \u2192 http://" + PROXY_HOST + ":" + PROXY_PORT + PROXY_PREFIX_TO + '*');

// Load and process our tests.
var tests = process.argv.slice(2),
    suites = tests.length;

if (suites === 0) {
  console.log("ERROR: Nothing to test. Please pass files to test, like this:\n\n    node testrunner.js tests/path/to/test1.js tests/path/to/test2.js\n");
  // server.close(); // nothing to test
}

var testsuite;
var testsuites;

global.suite = function(name, options) {
  // console.log('suite', name);
  if (testsuite.name) {
    testsuites.push(testsuite);
    testsuite = { tests: [] };
  }
  testsuite.name = name;
  testsuite.options = options || {};
};

global.test = function(name, testfunction) {
  // console.log('test', name);
  testsuite.tests.push({
    name: name,
    test: testfunction
  });
};

global.ok = function(value, message) {
  assert.ok(value, message);
};

global.equals = function(actual, expected, message) {
  assert.equal(actual, expected, message);
};

global.same = function(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
};

function buildVowsSuite() {
  var suite = vows.describe("QUnit");

  testsuites.push(testsuite);
  testsuites.forEach(function(ts) {
    var tests = { topic: true };

    testsuite.tests.forEach(function(test) {
      tests[test.name] = function() {
        if (testsuite.options.setup) testsuite.options.setup();
        test.test();
        if (testsuite.options.teardown) testsuite.options.teardown();
      };
    });

    var batch = {};
    batch[testsuite.name] = tests;
    suite.addBatch(batch);
  });

  return suite;
}

function runVowsTest(aPath) {
  try {
    if (aPath.indexOf('qunit') !== -1) {
      // Capture qunit test.
      testsuite = { tests: [] };
      testsuites = [];
      require(aPath);
      // console.log(testsuite);
      buildVowsSuite().run(null, function(results) {
        suites--;
        // if (suites === 0) server.close(); // the process will exit now
      });
    } else {
      // Run vows test directly.
      require(aPath).run(null, function(results) {
        suites--;
        // if (suites === 0) server.close(); // the process will exit now
      });
    }
  } catch (e) { suites--; console.log(e); }
}

function processPath(aPath) {
  var stat = fs.statSync(aPath);

  if (stat.isFile()) {
    if (aPath.slice(-3) === '.js') runVowsTest(aPath);
  } else {
    fs.readdirSync(aPath).forEach(function(filename) {
      var testpath = path.join(aPath, filename);
      stat = fs.statSync(testpath);
      if (stat.isFile() && testpath.slice(-3) === '.js') {
        runVowsTest(testpath);
      } else if (stat.isDirectory()) {
        processPath(testpath);
      } else {
        // console.log("the file is something strange");
      }
    });
  }
}
// console.log(tests);
tests.forEach(function(testpath) {
  if (testpath) processPath(path.join(__dirname, testpath));
});
