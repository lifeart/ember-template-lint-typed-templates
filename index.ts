'use strict';

import { Rule } from 'ember-template-lint';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { URI } from 'vscode-uri';

import { createMessageConnection, IPCMessageReader, IPCMessageWriter } from 'vscode-jsonrpc/node';
import {  DidOpenTextDocumentNotification, ExecuteCommandRequest,
  InitializeRequest  } from 'vscode-languageserver-protocol/node';

import type { MessageConnection }  from 'vscode-jsonrpc/node';

let server = null;
let connection: MessageConnection = null;

function startServer() {
  const serverPath = require.resolve('@lifeart/ember-language-server/lib/start-server');

  return cp.fork(serverPath, [], {
    cwd: process.cwd()
  });
}

// process.on('exit', function () {
//   connection.dispose();
//   server.kill();
// });

function createConnection(serverProcess) {
  return createMessageConnection(
    new IPCMessageReader(serverProcess),
    new IPCMessageWriter(serverProcess)
  );
}

export async function initServer(connection: MessageConnection, root) {
  const params = {
    rootUri: URI.file(root).toString(),
    capabilities: {},
    initializationOptions: {
      isELSTesting: true,
    },
  };

  return connection.sendRequest(InitializeRequest.type as any, params);
}


function createTextDocument(rawFilePath) {
  let filePath = rawFilePath;
  if (!path.isAbsolute(filePath)) {
    filePath = path.join(process.cwd(), filePath);
  }
  const uri = URI.file(filePath).toString();
  // doc.uri = uri;
  return {
    text: fs.readFileSync(filePath, 'utf8'),
    uri: uri
  }
}

async function openFile(connection: MessageConnection, filePath: string) {
  const result = await connection.sendNotification(DidOpenTextDocumentNotification.type as any, {
    textDocument: createTextDocument(filePath)
  });
  // console.log('result', result);
  return result;
}



async function registerProject(connection, root: string) {
  // console.log('path.normalize(root)', path.normalize(root));
  const params = {
    command: 'els.registerProjectPath',
    arguments: [path.normalize(root)],
  };

  return connection.sendRequest(ExecuteCommandRequest.type, params);
}

async function diagnosticsForFile(connection, file: string) {
  const document = createTextDocument(file);
  const params = {
    command: 'els.provideDiagnostics',
    arguments: [ document ]
  }
  // console.log(document);
  return connection.sendRequest(ExecuteCommandRequest.type, params);
}


// console.log('1');
module.exports = class TypedTemplates extends Rule {
  async visitor() {
    server = startServer();
    connection = createConnection(server);
    connection.listen();
    let initResult = initServer(connection, process.cwd());

    console.log('visitor');
    // this._filePath = 'app/components/foo-bar/index.hbs';
    // console.log(this);
    await initResult;
    // console.log(initResult);
    console.log(process.cwd());

    const pr = await registerProject(connection, path.join(process.cwd()));
    await openFile(connection, this._filePath);

    // console.log('registeredProject', pr);
    // console.log(this._filePath);

    const diagnostics = await diagnosticsForFile(connection, this._filePath);
  //  console.log(JSON.stringify(diagnostics.map(e=>e.range)));

    // const pl = [{
    //     "severity":1,
    //     "range":{"start":{"line":2,"character":6},"end":{"line":2,"character":12}},"message":"Property 'b' does not exist on type 'FooBarComponentTemplate'.","source":"typed-templates"},{"severity":1,"range":{"start":{"line":3,"character":7},"end":{"line":3,"character":9}},"message":"Property 'n' does not exist on type '{}'.","source":"typed-templates"}];

    return {
      Template: {
        enter() {
          diagnostics.forEach((item)=>{
            console.log(item.range);
            this.log({
              message: item.message,
              line: item.range.start.line + 1,
              column: item.range.start.character,
              source: this.sourceForLoc({
                start: {
                  line: item.range.start.line + 1,
                  column: item.range.start.character
                },
                end: {
                  line: item.range.end.line + 1,
                  column: item.range.end.character
                }
              })
              // rule: 'typed-templates',
            })
          });
        },
        exit() {
          connection.dispose();
          server.kill();
        }
      }
    };
  }
};