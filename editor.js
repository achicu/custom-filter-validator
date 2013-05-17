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

    function Editor(options) {
        _.extend(this, options);
        this.init();
    }

    _.extend(Editor.prototype, {
        init: function() {
            this.angleLib = new Global.AngleLib();
            this.angleLib.on("completed", this.onAngleLoaded.bind(this));
            this.angleLib.load();
        },

        onAngleLoaded: function() {
            this.inputBox.on("keyup", this.onInputBoxChanged.bind(this));
        },

        onInputBoxChanged: function() {
            var self = this;
            this.angleLib.compile("fragment", this.inputBox.val(), function(err, data) {
                var newInputValue = self.inputBox.val();
                if (data.original != newInputValue) {
                    // Input changed while waiting for the second thread. Ignore the results.
                    return;
                }
                self.errorsBox.empty();
                if (!data.compileResult) {
                    // Had some errors while compiling.
                    _.each(data.errors, function(error) {
                        self.errorsBox.append(
                            $("<div class='error' />")
                                .append($("<span class='badge' />").addClass(error.type.toLowerCase()))
                                .append($("<span class='label' />").text(error.error))
                            );
                    });
                }
                console.log(data);
            });
        }
    });

    Global.Editor = Editor;


    $(function() {
        var editor = new Editor({
            inputBox: $("#input-box"),
            generatedBox: $("#generated-box"),
            errorsBox: $("#errors-box")
        });
    });
})();