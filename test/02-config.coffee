lfa = require '../lib'
path = require 'path'
child_process = require 'child_process'
nodefn = require 'when/node'
should = require 'should'

fixturePath = path.join __dirname, 'fixtures'

describe 'Config', ->
  cleanUp = (projPath) ->
    lfaPath = path.join projPath, '.lfa'
    nodefn.call child_process.exec, 'rm -rf "' + lfaPath + '"'
      .catch ->

  it 'should error out if lfa.json doesn\'t exist', ->
    projPath = path.join fixturePath, 'config-nojson'
    (new lfa.Project(projPath)).loaded.then((proj) ->
      throw new Error('It should have errored out')
    , (err) ->
      throw err if err.code != 'ENOENT'
    )
      .finally cleanUp.bind null, projPath
        
  it 'should error out if /extensions is not a directory', ->
    projPath = path.join fixturePath, 'config-extwrongfile'
    (new lfa.Project(projPath)).loaded.then((proj) ->
      throw new Error('It should have errored out')
    , (err) ->
      if err.code != 'ENOTDIR'
        throw err
    )
      .finally cleanUp.bind null, projPath
      
  it 'should load extension from /extensions', ->
    projPath = path.join fixturePath, 'config-extlocal'
    (new lfa.Project(projPath)).loaded
      .then (proj) ->
        should(proj.testExtensionLoaded).be.ok
      .finally cleanUp.bind null, projPath

  it 'should error out if extension doesn\'t have lfa.json', ->
    projPath = path.join fixturePath, 'config-extnojson'
    (new lfa.Project(projPath)).loaded.then((proj) ->
      throw new Error('It should have errored out')
    , (err) ->
      if err.code != 'ENOENT'
        throw err
    )
      .finally cleanUp.bind null, projPath
