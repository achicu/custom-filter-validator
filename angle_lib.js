/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {

    // The following function will run in the worker thread.
    function WorkerInit() {
        /*global Module:true, self:true, allocate:true, cwrap:true, intArrayFromString:true, Runtime:true,
                 ALLOC_STACK:true, setValue:true, getValue:true, Pointer_stringify:true, Blob:true, webkitURL:true */
        /*jshint newcap:false, onecase:true */
        Module['print'] = function(str) {
            self.postMessage({type: "error", value: str});
        }

        var cwrap = Module['cwrap'];

        var Free = cwrap("free", "void", ["number"]);
        var ShCompile = cwrap("ShCompile", "number", ["number", "number", "number", "number"]);
        var ShConstructCompiler = cwrap("ShConstructCompiler", "number", ["number", "number", "number", "number"]);
        var ShFinalize = cwrap("ShFinalize", "number");
        var ShGetActiveUniform = cwrap("ShGetActiveUniform", "void", ["number", "number", "number", "number", "number", "number", "number"]);
        var ShGetInfo = cwrap("ShGetInfo", "void", ["number", "number", "number"]);
        var ShGetInfoLog = cwrap("ShGetInfoLog", "void", ["number", "number"]);
        var ShGetObjectCode = cwrap("ShGetObjectCode", "void", ["number", "number"]);
        var ShInitBuiltInResources = cwrap("ShInitBuiltInResources", "void", ["number"]);
        var ShInitialize = cwrap("ShInitialize");

        var SH_ACTIVE_UNIFORM_MAX_LENGTH = 0x8B87;
        var SH_ACTIVE_UNIFORMS = 0x8B86;
        var SH_ATTRIBUTES_UNIFORMS = 0x0008;
        var SH_CSS_SHADERS_SPEC = 0x8B42;
        var SH_ESSL_OUTPUT = 0x8B45;
        var SH_FRAGMENT_SHADER = 0x8B30;
        var SH_INFO_LOG_LENGTH = 0x8B84;
        var SH_INTERMEDIATE_TREE = 0x0002;
        var SH_GLSL_OUTPUT = 0x8B46;
        var SH_HLSL_OUTPUT = 0x8B47;
        var SH_JS_OUTPUT = 0x8B48;
        var SH_OBJECT_CODE = 0x0004;
        var SH_OBJECT_CODE_LENGTH = 0x8B88;
        var SH_VERTEX_SHADER = 0x8B31;
        var SH_WEBGL_SPEC = 0x8B41;

        var types = {
            0: "none",

            0x1406: "float",
            0x8B50: "vec2",
            0x8B51: "vec3",
            0x8B52: "vec4",

            0x1404: "int",
            0x8B53: "ivec2",
            0x8B54: "ivec3",
            0x8B55: "ivec4",

            0x8B56: "bool",
            0x8B57: "bool2",
            0x8B58: "bool3",
            0x8B59: "bool4",

            0x8B5A: "mat2",
            0x8B5B: "mat3",
            0x8B5C: "mat4",

            0x8B5E: "sampler2d"

            // 0x8B60: "sampler3d"

            // 0x8B63: "sampler2d_rect",
            // 0x8D66: "sampler2d_external"
        };

        ShInitialize();

        function getBuiltinResources() {
            var builtinResources = allocate(100 * 4, 'i8'); // big enough to cover for the size of ShBuiltInResources
            ShInitBuiltInResources(builtinResources);
            return builtinResources;
        }

        var compilers = {
            //"css.vertex.js": ShConstructCompiler(SH_VERTEX_SHADER, SH_CSS_SHADERS_SPEC, SH_JS_OUTPUT, getBuiltinResources()),
            "css.vertex.glsl": ShConstructCompiler(SH_VERTEX_SHADER, SH_CSS_SHADERS_SPEC, SH_GLSL_OUTPUT, getBuiltinResources()),
            "webgl.vertex.glsl": ShConstructCompiler(SH_VERTEX_SHADER, SH_WEBGL_SPEC, SH_GLSL_OUTPUT, getBuiltinResources()),
            "webgl.vertex.hlsl": ShConstructCompiler(SH_VERTEX_SHADER, SH_WEBGL_SPEC, SH_HLSL_OUTPUT, getBuiltinResources()),
            //"css.fragment.js": ShConstructCompiler(SH_FRAGMENT_SHADER, SH_CSS_SHADERS_SPEC, SH_JS_OUTPUT, getBuiltinResources()),
            "css.fragment.glsl": ShConstructCompiler(SH_FRAGMENT_SHADER, SH_CSS_SHADERS_SPEC, SH_GLSL_OUTPUT, getBuiltinResources()),
            "webgl.fragment.glsl": ShConstructCompiler(SH_FRAGMENT_SHADER, SH_WEBGL_SPEC, SH_GLSL_OUTPUT, getBuiltinResources()),
            "webgl.fragment.hlsl": ShConstructCompiler(SH_FRAGMENT_SHADER, SH_WEBGL_SPEC, SH_HLSL_OUTPUT, getBuiltinResources())
        };

        function compile(type, shaderString) {
            var stack = Runtime.stackSave();
            var compiler = compilers[type];

            var shaderStringPtr = allocate(intArrayFromString(shaderString), 'i8', ALLOC_STACK);
            var strings = allocate(4, 'i32', ALLOC_STACK);
            setValue(strings, shaderStringPtr, 'i32');
            var compileResult = ShCompile(compiler, strings, 1, SH_OBJECT_CODE | SH_ATTRIBUTES_UNIFORMS);

            var result = {
                original: shaderString,
                compileResult: compileResult,
                uniforms: []
            };

            setValue(strings, 0, 'i32');
            ShGetInfo(compiler, SH_OBJECT_CODE_LENGTH, strings);
            var length = getValue(strings, 'i32');

            var shaderResultStringPtr = allocate(length, 'i8', ALLOC_STACK);
            ShGetObjectCode(compiler, shaderResultStringPtr);
            result.source = length > 1 ? Pointer_stringify(shaderResultStringPtr, length - 1) : "";

            setValue(strings, 0, 'i32');
            ShGetInfo(compiler, SH_INFO_LOG_LENGTH, strings);
            length = getValue(strings, 'i32');

            shaderResultStringPtr = allocate(length, 'i8', ALLOC_STACK);
            ShGetInfoLog(compiler, shaderResultStringPtr);
            result.info = length > 1 ? Pointer_stringify(shaderResultStringPtr, length - 1) : "";

            setValue(strings, 0, 'i32');
            ShGetInfo(compiler, SH_ACTIVE_UNIFORMS, strings);
            var uniformsCount = getValue(strings, 'i32');

            setValue(strings, 0, 'i32');
            ShGetInfo(compiler, SH_ACTIVE_UNIFORM_MAX_LENGTH, strings);
            var maxUnfiromNameLength = getValue(strings, 'i32');
            var uniformName = allocate(maxUnfiromNameLength, 'i8', ALLOC_STACK);
            for (var i = 0; i < uniformsCount; ++i) {
                setValue(strings, 0, 'i32');
                setValue(strings + 4, 0, 'i32');
                setValue(strings + 8, 0, 'i32');
                ShGetActiveUniform(compiler, i, strings, strings + 4, strings + 8, uniformName, 0);
                var uniformNameLength = getValue(strings, 'i32');
                var uniformType = getValue(strings + 8, 'i32');
                if (!types.hasOwnProperty(uniformType))
                    continue;
                result.uniforms.push({
                    size: getValue(strings + 4, 'i32'),
                    type: types[uniformType],
                    name: Pointer_stringify(uniformName, uniformNameLength)
                });
            }

            Runtime.stackRestore(stack);
            return result;
        }

        this.onmessage = function(event) {
            switch (event.data.type) {
                case "compile":
                    try {
                        var result = compile(event.data.shaderType, event.data.source);
                        self.postMessage({
                            type: "result",
                            result: result,
                            callback: event.data.callback
                        });
                    } catch (e) {
                        self.postMessage({
                            type: "error",
                            error: e ? e.toString() : "Undefined error",
                            callback: event.data.callback
                        });
                    }
                break;
                case "shader":
                    try {
                        var result = {
                            cssShader: null,
                            glslShader: null,
                            hlslShader: null
                        };
                        result.cssShader = compile("css." + event.data.shaderType + ".glsl", event.data.source);
                        if (result.cssShader.compileResult) {
                            result.cssShader.source = event.data.prefix + result.cssShader.source + event.data.sufix;
                            result.glslShader = compile("webgl." + event.data.shaderType + ".glsl", result.cssShader.source);
                            result.hlslShader = compile("webgl." + event.data.shaderType + ".hlsl", result.cssShader.source);
                        }
                        self.postMessage({
                            type: "result",
                            result: result,
                            callback: event.data.callback
                        });
                    } catch (e) {
                        self.postMessage({
                            type: "error",
                            error: e ? e.toString() : "Undefined error",
                            callback: event.data.callback
                        });
                    }
                break;
                case "start":
                    self.postMessage({type: 'loaded'});
                break;
                default:
                    self.postMessage({
                        type: "error",
                        error: "Unrecognized command",
                        callback: event.data.callback
                    });
                    break;
            }
        };
    }

    function AngleLib() {
        this.lastCallbackId = 0;
        this.callbacks = {};
    }

    _.extend(AngleLib.prototype, Backbone.Events, {
        angleJS: "angle/angle.closure.js",

        load: function() {
            if (this.loadStarted)
                return;
            this.loadStarted = true;
            var self = this;
            var xhr = new XMLHttpRequest();
            xhr.onprogress = function(ev) {
                self.trigger("progress", ev.loaded / ev.total);
            };
            xhr.onreadystatechange = function(ev) {
                if (xhr.readyState != 4 || xhr.status != 200)
                    return;
                var blob = new Blob([xhr.response, "\n(", WorkerInit.toString(), ")();"]);
                self.worker = new Worker(URL.createObjectURL(blob));
                self.worker.onmessage = function(ev) {
                    self.onWorkerMessage(ev);
                };
                // Start the worker.
                self.worker.postMessage({type: "start"});
                self.trigger("downloaded");
            };
            xhr.open("GET", this.angleJS);
            xhr.send();
        },

        onWorkerMessage: function(ev) {
            switch (ev.data.type) {
                case 'result':
                    this.onWorkerResult(ev.data);
                    break;
                case 'loaded':
                    this.onWorkerLoaded();
                    break;
                case 'error':
                    this.onWorkerError(ev.data);
                    break;
            }
        },

        parseErrors: function(errorsString) {
            var errors = [],
                match,
                parser = /^(\w*):\s(\d*):(.*)/gm;
            while((match = parser.exec(errorsString)) !== null) {
                errors.push({
                    type: match[1],
                    index: parseInt(match[2], 10),
                    error: match[3]
                });
            }
            return errors;
        },

        onWorkerResult: function(data) {
            var callback = this._getCallback(data.callback);
            if (!callback)
                return;
            var result = data.result;
            callback(null, result);
        },

        onWorkerLoaded: function(data) {
            this.loaded = true;
            this.trigger("completed");
        },

        onWorkerError: function(data) {
            console.log(data);
            var callback = this._getCallback(data.callback);
            if (!callback)
                return;
            callback(data.error);
        },

        _registerCallback: function(callback) {
            var id = ++this.lastCallbackId;
            this.callbacks[id] = callback;
            return id;
        },

        _getCallback: function(id) {
            var callback = this.callbacks[id];
            delete this.callbacks[id];
            return callback;
        },

        compile: function(type, source, callback) {
            this.worker.postMessage({
                type: "compile",
                shaderType: type,
                source: source,
                callback: this._registerCallback(callback)
            });
        },

        shader: function(type, prefix, sufix, source, callback) {
            this.worker.postMessage({
                type: "shader",
                shaderType: type,
                source: source,
                prefix: prefix,
                sufix: sufix,
                callback: this._registerCallback(callback)
            });
        }
    });

    Global.AngleLib = AngleLib;
})();