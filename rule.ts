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
  return {
    text: fs.readFileSync(filePath, 'utf8'),
    uri: uri
  }
}

async function openFile(connection: MessageConnection, filePath: string) {
  const result = await connection.sendNotification(DidOpenTextDocumentNotification.type as any, {
    textDocument: createTextDocument(filePath)
  });
  return result;
}



async function registerProject(connection, root: string) {
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
  return connection.sendRequest(ExecuteCommandRequest.type, params);
}


module.exports = class TypedTemplates extends Rule {
  async visitor() {
    server = startServer();
    connection = createConnection(server);
    connection.listen();
    let initResult = initServer(connection, process.cwd());

    await initResult;

    const pr = await registerProject(connection, path.join(process.cwd()));
    await openFile(connection, this._filePath);
    const diagnostics = await diagnosticsForFile(connection, this._filePath);

    return {
      Template: {
        enter() {
          diagnostics.forEach((item)=>{
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