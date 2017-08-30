Index: resources/tests.js
===================================================================
--- resources/tests.js	(revision 221130)
+++ resources/tests.js	(working copy)
@@ -326,9 +326,10 @@
     name: 'jQuery-TodoMVC',
     url: 'todomvc/architecture-examples/jquery/index.html',
     prepare: function (runner, contentWindow, contentDocument) {
-        return runner.waitForElement('#new-todo').then(function (element) {
-            element.focus();
-            return element;
+        return runner.waitForElement('#appIsReady').then(function (element) {
+            var newTodo = contentDocument.getElementById('new-todo');
+            newTodo.focus();
+            return newTodo;
         });
     },
     tests: [
Index: resources/todomvc/architecture-examples/jquery/js/app.js
===================================================================
--- resources/todomvc/architecture-examples/jquery/js/app.js	(revision 221130)
+++ resources/todomvc/architecture-examples/jquery/js/app.js	(working copy)
@@ -46,6 +46,10 @@
                     this.render();
                 }.bind(this)
             }).init('/all');
+
+            var dummyNodeToNotifyAppIsReady = document.createElement('div');
+            dummyNodeToNotifyAppIsReady.id = 'appIsReady';
+            document.body.appendChild(dummyNodeToNotifyAppIsReady);
         },
         bindEvents: function () {
             $('#new-todo').on('keyup', this.create.bind(this));
