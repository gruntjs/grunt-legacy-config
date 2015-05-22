/*!
 * grunt <http://gruntjs.com/>
 *
 * Copyright (c) 2013-2015 "Cowboy" Ben Alman.
 * Licensed under the MIT license.
 */

'use strict';

/* deps:mocha */
var assert = require('assert');
var grunt = require('grunt');
var legacyConfig = require('../');
var config;

describe('config', function () {
  beforeEach(function(done) {
    config = legacyConfig.create({grunt: grunt});
    this.origData = config.data;

    config.init({
      meta: grunt.file.readJSON('test/fixtures/test.json'),
      foo: '<%= meta.foo %>',
      foo2: '<%= foo %>',
      obj: {
        foo: '<%= meta.foo %>',
        foo2: '<%= obj.foo %>',
        Arr: ['foo', '<%= obj.foo2 %>'],
        arr2: ['<%= arr %>', '<%= obj.Arr %>'],
      },
      bar: 'bar',
      arr: ['foo', '<%= obj.foo2 %>'],
      arr2: ['<%= arr %>', '<%= obj.Arr %>'],
      buffer: new Buffer('test'),
    });
    done();
  });

  afterEach(function(done) {
    config.data = this.origData;
    done();
  });

  it('config.escape', function() {
    assert.equal(config.escape('foo'), 'foo', 'Should do nothing if no . chars.');
    assert.equal(config.escape('foo.bar.baz'), 'foo\\.bar\\.baz', 'Should escape all . chars.');
  });

  it('config.getPropString', function() {
    assert.equal(config.getPropString('foo'), 'foo', 'Should do nothing if already a string.');
    assert.equal(config.getPropString('foo.bar.baz'), 'foo.bar.baz', 'Should do nothing if already a string.');
    assert.equal(config.getPropString(['foo', 'bar']), 'foo.bar', 'Should join parts into a dot-delimited string.');
    assert.equal(config.getPropString(['foo.bar', 'baz.qux.zip']), 'foo\\.bar.baz\\.qux\\.zip', 'Should join parts into a dot-delimited string, escaping . chars in parts.');
  });

  it('config.getRaw', function() {
    assert.equal(config.getRaw('foo'), '<%= meta.foo %>', 'Should not process templates.');
    assert.equal(config.getRaw('obj.foo2'), '<%= obj.foo %>', 'Should not process templates.');
    assert.equal(config.getRaw(['obj', 'foo2']), '<%= obj.foo %>', 'Should not process templates.');
    assert.deepEqual(config.getRaw('arr'), ['foo', '<%= obj.foo2 %>'], 'Should not process templates.');
  });

  it('config.process', function() {
    assert.equal(config.process('<%= meta.foo %>'), 'bar', 'Should process templates.');
    assert.equal(config.process('<%= foo %>'), 'bar', 'Should process templates recursively.');
    assert.equal(config.process('<%= obj.foo %>'), 'bar', 'Should process deeply nested templates recursively.');
    assert.deepEqual(config.process(['foo', '<%= obj.foo2 %>']), ['foo', 'bar'], 'Should process templates in arrays.');
    assert.deepEqual(config.process(['<%= arr %>', '<%= obj.Arr %>']), [['foo', 'bar'], ['foo', 'bar']], 'Should expand <%= arr %> and <%= obj.Arr %> values as objects if possible.');
    var buf = config.process('<%= buffer %>');
    assert.ok(Buffer.isBuffer(buf), 'Should retrieve Buffer instances as Buffer.');
    assert.deepEqual(buf, new Buffer('test'), 'Should return buffers as-is.');
  });

  it('config.get', function() {
    assert.equal(config.get('foo'), 'bar', 'Should process templates.');
    assert.equal(config.get('foo2'), 'bar', 'Should process templates recursively.');
    assert.equal(config.get('obj.foo2'), 'bar', 'Should process deeply nested templates recursively.');
    assert.equal(config.get(['obj', 'foo2']), 'bar', 'Should process deeply nested templates recursively.');
    assert.deepEqual(config.get('arr'), ['foo', 'bar'], 'Should process templates in arrays.');
    assert.deepEqual(config.get('obj.Arr'), ['foo', 'bar'], 'Should process templates in arrays.');
    assert.deepEqual(config.get('arr2'), [['foo', 'bar'], ['foo', 'bar']], 'Should expand <%= arr %> and <%= obj.Arr %> values as objects if possible.');
    assert.deepEqual(config.get(['obj', 'arr2']), [['foo', 'bar'], ['foo', 'bar']], 'Should expand <%= arr %> and <%= obj.Arr %> values as objects if possible.');
    var buf = config.get('buffer');
    assert.ok(Buffer.isBuffer(buf), 'Should retrieve Buffer instances as Buffer.');
    assert.deepEqual(buf, new Buffer('test'), 'Should return buffers as-is.');
  });

  it('config.set', function() {
    assert.equal(config.set('foo3', '<%= foo2 %>'), '<%= foo2 %>', 'Should set values.');
    assert.equal(config.getRaw('foo3'), '<%= foo2 %>', 'Should have set the value.');
    assert.equal(config.data.foo3, '<%= foo2 %>', 'Should have set the value.');
    assert.equal(config.set('a.b.c', '<%= foo2 %>'), '<%= foo2 %>', 'Should create interim objects.');
    assert.equal(config.getRaw('a.b.c'), '<%= foo2 %>', 'Should have set the value.');
    assert.equal(config.data.a.b.c, '<%= foo2 %>', 'Should have set the value.');
  });

  it('config.merge', function() {
    assert.deepEqual(config.merge({}), config.getRaw(), 'Should return internal data object.');
    config.set('obj', {a: 12});

    config.merge({foo: 'test', baz: '123', obj: {a: 34, b: 56}, });
    assert.deepEqual(config.getRaw('foo'), 'test', 'Should overwrite existing properties.');
    assert.deepEqual(config.getRaw('baz'), '123', 'Should add new properties.');
    assert.deepEqual(config.getRaw('obj'), {a: 34, b: 56}, 'Should deep merge.');
  });

  it('config', function() {
    assert.equal(config('foo'), 'bar', 'Should retrieve processed data.');
    assert.equal(config('obj.foo2'), 'bar', 'Should retrieve processed data.');
    assert.equal(config(['obj', 'foo2']), 'bar', 'Should retrieve processed data.');
    assert.deepEqual(config('arr'), ['foo', 'bar'], 'Should process templates in arrays.');

    assert.equal(config('foo3', '<%= foo2 %>'), '<%= foo2 %>', 'Should set values.');
    assert.equal(config.getRaw('foo3'), '<%= foo2 %>', 'Should have set the value.');
    assert.equal(config.data.foo3, '<%= foo2 %>', 'Should have set the value.');
    assert.equal(config('a.b.c', '<%= foo2 %>'), '<%= foo2 %>', 'Should create interim objects.');
    assert.equal(config.getRaw('a.b.c'), '<%= foo2 %>', 'Should have set the value.');
    assert.equal(config.data.a.b.c, '<%= foo2 %>', 'Should have set the value.');
  });

  describe('config.requires', function() {
    it('should not throw when properties exist:', function() {
      grunt.log.muted = true;
      assert.doesNotThrow(function() { config.requires('foo'); }, 'This property exists.');
      assert.doesNotThrow(function() { config.requires('obj.foo'); }, 'This property exists.');
      assert.doesNotThrow(function() { config.requires('foo', 'obj.foo', 'obj.foo2'); }, 'These properties exist.');
      assert.doesNotThrow(function() { config.requires('foo', ['obj', 'foo'], ['obj', 'foo2']); }, 'These properties exist.');
      grunt.log.muted = false;
    });
    it('should throw when properties do not exist:', function() {
      grunt.log.muted = true;
      assert.throws(function() { config.requires('xyz'); }, 'This property does not exist.');
      assert.throws(function() { config.requires('obj.xyz'); }, 'This property does not exist.');
      assert.throws(function() { config.requires('foo', 'obj.foo', 'obj.xyz'); }, 'One property does not exist.');
      assert.throws(function() { config.requires('foo', ['obj', 'foo'], ['obj', 'xyz']); }, 'One property does not exist.');
      grunt.log.muted = false;
    });
  });
});
