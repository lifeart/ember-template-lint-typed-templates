"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.initServer = initServer;
var _emberTemplateLint = require("ember-template-lint");
var cp = _interopRequireWildcard(require("child_process"));
var path = _interopRequireWildcard(require("path"));
var fs = _interopRequireWildcard(require("fs"));
var _vscodeLanguageserverTextdocument = require("vscode-languageserver-textdocument");
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
    return _vscodeLanguageserverTextdocument.TextDocument.create(uri, '', 1, fs.readFileSync(filePath, 'utf8'));
}
async function openFile(connection1, filePath) {
    const result = await connection1.sendNotification(_node1.DidOpenTextDocumentNotification.type, {
        textDocument: createTextDocument(filePath)
    });
    console.log('result', result);
    return result;
}
server = startServer();
connection = createConnection(server);
connection.listen();
let initResult = initServer(connection, process.cwd());
async function registerProject(connection1, root) {
    console.log('path.normalize(root)', path.normalize(root));
    const params = {
        command: 'els.registerProjectPath',
        arguments: [
            path.normalize(root)
        ]
    };
    return connection1.sendRequest(_node1.ExecuteCommandRequest.type, params);
}
module.exports = (function() {
    class TypedTemplates extends _emberTemplateLint.Rule {
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
            connection.sendRequest(_node1.DidChangeTextDocumentNotification.type, {
                textDocument: createTextDocument(this._filePath)
            });
            let resolveP;
            let p = new Promise((resolve)=>{
                resolveP = resolve;
            });
            connection.onNotification(_node1.PublishDiagnosticsNotification.type, (params)=>{
                console.log('d', params.diagnostics);
                resolveP(params.diagnostics);
            });
            await p;
            return {
                CommentStatement (node) {
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
    }
    return TypedTemplates;
})();

