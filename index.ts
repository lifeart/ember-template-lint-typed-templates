'use strict';

import { Rule } from 'ember-template-lint';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { TextDocument  } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

import { createMessageConnection, IPCMessageReader, IPCMessageWriter } from 'vscode-jsonrpc/node';
import {  DidOpenTextDocumentNotification, ExecuteCommandRequest, DidChangeTextDocumentNotification,   PublishDiagnosticsNotification,
  InitializeRequest  } from 'vscode-languageserver-protocol/node';

import type { MessageConnection }  from 'vscode-jsonrpc/node';
import type { PublishDiagnosticsParams } from 'vscode-languageserver-protocol/node';

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
  return TextDocument.create(uri, '', 1, fs.readFileSync(filePath, 'utf8'));
}

async function openFile(connection: MessageConnection, filePath: string) {
  const result = await connection.sendNotification(DidOpenTextDocumentNotification.type as any, {
    textDocument: createTextDocument(filePath)
  });
  console.log('result', result);
  return result;
}

server = startServer();
connection = createConnection(server);
connection.listen();
let initResult = initServer(connection, process.cwd());


async function registerProject(connection, root: string) {
  console.log('path.normalize(root)', path.normalize(root));
  const params = {
    command: 'els.registerProjectPath',
    arguments: [path.normalize(root)],
  };

  return connection.sendRequest(ExecuteCommandRequest.type, params);
}

module.exports = class TypedTemplates extends Rule {
  async visitor() {
    console.log('visitor');
    this._filePath = 'app/components/foo-bar/index.hbs';
    await initResult;
    // console.log(initResult);
    // console.log(process.cwd());
    const pr = await registerProject(connection, path.join(process.cwd()));
    console.log('registeredProject', pr);
    // console.log(this._filePath);
    await openFile(connection, this._filePath);
    connection.sendRequest(DidChangeTextDocumentNotification.type as any, {
      textDocument: createTextDocument(this._filePath)
    });
    let resolveP: any;

    let p = new Promise((resolve)=>{
      resolveP = resolve;
    });

    connection.onNotification(PublishDiagnosticsNotification.type, (params: PublishDiagnosticsParams) => {
      console.log('d', params.diagnostics);
      resolveP(params.diagnostics);
    });

    await p;

    return {
      CommentStatement(node) {
        if (node.value.trim() === '') {
          this.log({
            message: 'comments cannot be empty',
            line: node.loc && node.loc.start.line,
            column: node.loc && node.loc.start.column,
            source: this.sourceForNode(node)
          });
        }
      }
    };
  }
};