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
    return {
        text: fs.readFileSync(filePath, 'utf8'),
        uri: uri
    };
}
async function openFile(connection1, filePath) {
    const result = await connection1.sendNotification(_node1.DidOpenTextDocumentNotification.type, {
        textDocument: createTextDocument(filePath)
    });
    return result;
}
async function registerProject(connection1, root) {
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
    return connection1.sendRequest(_node1.ExecuteCommandRequest.type, params);
}
let watchdog = null;
let initResult = null;
module.exports = (function() {
    class TypedTemplates extends _emberTemplateLint.Rule {
        async visitor() {
            clearTimeout(watchdog);
            if (watchdog === null) {
                server = startServer();
                connection = createConnection(server);
                connection.listen();
                initResult = initServer(connection, process.cwd());
                await initResult;
                await registerProject(connection, path.join(process.cwd()));
            }
            await openFile(connection, this._filePath);
            const diagnostics = await diagnosticsForFile(connection, this._filePath);
            return {
                Template: {
                    enter () {
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
                            });
                        });
                    },
                    exit () {
                        watchdog = setTimeout(()=>{
                            connection.dispose();
                            server.kill();
                            watchdog = null;
                        }, 1000);
                    }
                }
            };
        }
    }
    return TypedTemplates;
})();

