"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.initServer = initServer;
var _emberTemplateLint = require("ember-template-lint");
var cp = _interopRequireWildcard(require("child_process"));
var path = _interopRequireWildcard(require("path"));
var fs = _interopRequireWildcard(require("fs"));
var _vscodeUri = require("vscode-uri");
var _node = require("vscode-jsonrpc/node");
var _node1 = require("vscode-languageserver-protocol/node");
function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
        return obj;
    } else {
        var newObj = {
        };
        if (obj != null) {
            for(var key in obj){
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {
                    };
                    if (desc.get || desc.set) {
                        Object.defineProperty(newObj, key, desc);
                    } else {
                        newObj[key] = obj[key];
                    }
                }
            }
        }
        newObj.default = obj;
        return newObj;
    }
}
'use strict';
let server = null;
let connection = null;
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
    return _node.createMessageConnection(new _node.IPCMessageReader(serverProcess), new _node.IPCMessageWriter(serverProcess));
}
async function initServer(connection1, root) {
    const params = {
        rootUri: _vscodeUri.URI.file(root).toString(),
        capabilities: {
        },
        initializationOptions: {
            isELSTesting: true
        }
    };
    return connection1.sendRequest(_node1.InitializeRequest.type, params);
}
function createTextDocument(rawFilePath) {
    let filePath = rawFilePath;
    if (!path.isAbsolute(filePath)) {
        filePath = path.join(process.cwd(), filePath);
    }
    const uri = _vscodeUri.URI.file(filePath).toString();
    // doc.uri = uri;
    return {
        text: fs.readFileSync(filePath, 'utf8'),
        uri: uri
    };
}
async function openFile(connection1, filePath) {
    const result = await connection1.sendNotification(_node1.DidOpenTextDocumentNotification.type, {
        textDocument: createTextDocument(filePath)
    });
    // console.log('result', result);
    return result;
}
async function registerProject(connection1, root) {
    // console.log('path.normalize(root)', path.normalize(root));
    const params = {
        command: 'els.registerProjectPath',
        arguments: [
            path.normalize(root)
        ]
    };
    return connection1.sendRequest(_node1.ExecuteCommandRequest.type, params);
}
async function diagnosticsForFile(connection1, file) {
    const document = createTextDocument(file);
    const params = {
        command: 'els.provideDiagnostics',
        arguments: [
            document
        ]
    };
    // console.log(document);
    return connection1.sendRequest(_node1.ExecuteCommandRequest.type, params);
}
// console.log('1');
module.exports = (function() {
    class TypedTemplates extends _emberTemplateLint.Rule {
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
            //  console.log(JSON.stringify(diagnostics));
            // const pl = [{
            //     "severity":1,
            //     "range":{"start":{"line":2,"character":6},"end":{"line":2,"character":12}},"message":"Property 'b' does not exist on type 'FooBarComponentTemplate'.","source":"typed-templates"},{"severity":1,"range":{"start":{"line":3,"character":7},"end":{"line":3,"character":9}},"message":"Property 'n' does not exist on type '{}'.","source":"typed-templates"}];
            return {
                Template: {
                    enter () {
                        diagnostics.forEach((item)=>{
                            this.log({
                                message: item.message,
                                line: item.range.start.line - 1,
                                column: item.range.start.character
                            });
                        });
                    },
                    exit () {
                        connection.dispose();
                        server.kill();
                    }
                }
            };
        }
    }
    return TypedTemplates;
})();

