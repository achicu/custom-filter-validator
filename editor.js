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

    var BlendingCodePrefix = "precision mediump float;\n" +
                             "mediump vec4 css_MixColor = vec4(0.0);\n" +
                             "mediump mat4 css_ColorMatrix = mat4(1.0);\n\n" +
                             "// BEGIN AUTHOR SHADER\n\n";
    var BlendingCodeSufix = "\n// END AUTHOR SHADER\n" +
                            "\n" +
                            "// \"multiply\" blend mode\n" +
                            "mediump vec3 css_BlendColor(mediump vec3 Cb, mediump vec3 Cs)\n" +
                            "{\n" +
                            "  return Cs * Cb;\n" +
                            "}\n" +
                            "\n" +
                            "// \"source-atop\" composite operator\n" +
                            "mediump vec4 css_Composite(mediump vec3 Cb, mediump float ab, mediump vec3 Cs, mediump float as)\n" +
                            "{\n" +
                            "  mediump float Fa = ab;\n" +
                            "  mediump float Fb = 1.0 - as;\n" +
                            "  return vec4(as * Fa * Cs + ab * Fb * Cb, as * Fa + ab * Fb);\n" +
                            "}\n" +
                            "\n" +
                            "uniform sampler2D css_u_texture;\n" +
                            "varying mediump vec2 css_v_texCoord;\n" +
                            "\n" +
                            "void main()\n" +
                            "{\n" +
                            "  css_main();\n" +
                            "  mediump vec4 originalColor = texture2D(css_u_texture, css_v_texCoord);\n" +
                            "\n" +
                            "  mediump vec4 multipliedColor = clamp(css_ColorMatrix * originalColor, 0.0, 1.0);\n" +
                            "  mediump vec4 clampedMixColor = clamp(css_MixColor, 0.0, 1.0);\n" +
                            "  mediump vec3 blendedColor = css_BlendColor(multipliedColor.rgb, clampedMixColor.rgb);\n" +
                            "  mediump vec3 weightedColor = (1.0 - multipliedColor.a) * clampedMixColor.rgb + multipliedColor.a * blendedColor;\n" +
                            "\n" +
                            "  gl_FragColor = css_Composite(multipliedColor.rgb, multipliedColor.a, weightedColor.rgb, clampedMixColor.a);\n" +
                            "}";

    function Editor(options) {
        _.extend(this, options);
        this.init();
        this.previousCode = null;
    }

    _.extend(Editor.prototype, {
        init: function() {
            this.infoBox.text("Loading ANGLE.js ...");
            this.angleLib = new Global.AngleLib();
            this.angleLib.on("completed", this.onAngleLoaded.bind(this));
            this.angleLib.load();
        },

        onAngleLoaded: function() {
            this.infoBox.text("ANGLE Loaded... Parsing ANGLE.JS...");
            this.onInputBoxChanged();
            this.inputBox.on("keyup", this.onInputBoxChanged.bind(this));
        },

        onInputBoxChanged: function() {
            var self = this,
                code = this.inputBox.val();
            if (code == this.previousCode)
                return;
            this.previousCode = code;
            self.infoBox.text("Compiling");
            this.angleLib.shader("fragment", BlendingCodePrefix, BlendingCodeSufix, code, function(err, data) {
                var newInputValue = self.inputBox.val();
                if (data.cssShader.original != newInputValue) {
                    // Input changed while waiting for the second thread. Ignore the results.
                    return;
                }
                self.infoBox.text("Ready");
                if (!data.cssShader.compileResult) {
                    // Had some errors while compiling.
                    self.generatedBox.val(data.cssShader.info);
                    self.glslBox.val("");
                    self.hlslBox.val("");
                } else {
                    self.generatedBox.val(data.cssShader.source);
                    self.glslBox.val(data.glslShader.compileResult ? data.glslShader.source : data.glslShader.info);
                    self.hlslBox.val(data.hlslShader.compileResult ? data.hlslShader.source : data.hlslShader.info);
                }
                
            });
        }
    });

    Global.Editor = Editor;


    $(function() {
        var editor = new Editor({
            inputBox: $("#input-box"),
            generatedBox: $("#generated-box"),
            glslBox: $("#glsl-box"),
            hlslBox: $("#hlsl-box"),
            infoBox: $("#info-box")
        });
    });
})();